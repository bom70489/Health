import { createClient } from "npm:@supabase/supabase-js@2";
import {
  bangkokDay,
  scheduledInstant,
  scheduledOn,
  type MedicationRow,
} from "../assistant/logic.ts";

type Candidate = {
  kind: "appointment" | "medication";
  id: string;
  patientId: string;
  version: number;
  scheduledAt: string;
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
// Constant-time-ish byte comparison; no privileged operation precedes secret validation.
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a),
    y = new TextEncoder().encode(b);
  let difference = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    difference |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return difference === 0;
}
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  const secret = Deno.env.get("REMINDER_CRON_SECRET");
  if (
    !secret ||
    !sameSecret(request.headers.get("x-reminder-secret") ?? "", secret)
  )
    return json({ error: "Unauthorized" }, 401);
  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const now = new Date(),
      since = new Date(now.getTime() - 5 * 60000);
    const [a, m, d] = await Promise.all([
      client
        .from("appointments")
        .select("id,patient_id,version,scheduled_at")
        .eq("status", "scheduled")
        .eq("reminders_enabled", true)
        .gte("scheduled_at", new Date(since.getTime() + 86400000).toISOString())
        .lte("scheduled_at", new Date(now.getTime() + 86400000).toISOString()),
      client
        .from("medication_plans")
        .select("*")
        .eq("is_active", true)
        .eq("reminders_enabled", true)
        .lte("start_date", bangkokDay(now)),
      client.from("device_tokens").select("id,user_id,expo_push_token"),
    ]);
    if (a.error || m.error || d.error)
      return json({ error: "Cannot load reminder records" }, 503);
    const candidates: Candidate[] = (a.data ?? []).map((row) => ({
      kind: "appointment",
      id: row.id,
      patientId: row.patient_id,
      version: row.version,
      scheduledAt: new Date(row.scheduled_at).toISOString(),
    }));
    const days = [...new Set([bangkokDay(since), bangkokDay(now)])];
    for (const plan of m.data ?? [])
      for (const day of days) {
        if (!scheduledOn(plan as MedicationRow, day)) continue;
        for (const time of plan.time_slots) {
          const scheduledAt = scheduledInstant(day, time);
          if (
            Date.parse(scheduledAt) >= since.getTime() &&
            Date.parse(scheduledAt) <= now.getTime()
          )
            candidates.push({
              kind: "medication",
              id: plan.id,
              patientId: plan.patient_id,
              version: plan.version,
              scheduledAt,
            });
        }
      }
    let accepted = 0,
      duplicatesOrStale = 0,
      errors = 0;
    for (const task of candidates)
      for (const device of (d.data ?? []).filter(
        (row) => row.user_id === task.patientId,
      )) {
        const claim = await client.rpc("claim_reminder", {
          p_kind: task.kind,
          p_record_id: task.id,
          p_version: task.version,
          p_scheduled_at: task.scheduledAt,
          p_device_token_id: device.id,
        });
        if (claim.error) {
          errors++;
          continue;
        }
        if (!claim.data) {
          duplicatesOrStale++;
          continue;
        }
        // Recheck just before sending. A subsequent edit cannot expose old instructions:
        // the lock-screen body is neutral and the route loads the current authorized record.
        const current = await client
          .from(
            task.kind === "appointment" ? "appointments" : "medication_plans",
          )
          .select("*")
          .eq("id", task.id)
          .single();
        const stale =
          current.error ||
          current.data.version !== task.version ||
          !current.data.reminders_enabled ||
          (task.kind === "appointment"
            ? current.data.status !== "scheduled"
            : !current.data.is_active);
        if (stale) {
          await client
            .from("notification_deliveries")
            .update({ status: "stale" })
            .eq("delivery_key", claim.data);
          duplicatesOrStale++;
          continue;
        }
        try {
          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(Deno.env.get("EXPO_ACCESS_TOKEN")
                ? {
                    Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}`,
                  }
                : {}),
            },
            body: JSON.stringify({
              to: device.expo_push_token,
              title: "แจ้งเตือนจากกรร",
              body: "ถึงเวลาตรวจสอบรายการสุขภาพของคุณในแอปกรร",
              sound: "default",
              data: {
                kind: task.kind,
                id: task.id,
                version: task.version,
                userId: task.patientId,
                key: claim.data,
                url: `/calendar/${task.kind}/${task.id}`,
              },
            }),
          });
          const ticket = (await response.json()).data;
          if (!response.ok || ticket?.status !== "ok")
            throw new Error(ticket?.details?.error || "PushRejected");
          await client
            .from("notification_deliveries")
            .update({ status: "sent", receipt_id: ticket.id })
            .eq("delivery_key", claim.data);
          accepted++;
        } catch (error) {
          const errorCode =
            error instanceof Error && /^[A-Za-z]+$/.test(error.message)
              ? error.message
              : "PushTransportError";
          await client
            .from("notification_deliveries")
            .update({ status: "error", error_code: errorCode })
            .eq("delivery_key", claim.data);
          if (errorCode === "DeviceNotRegistered")
            await client.from("device_tokens").delete().eq("id", device.id);
          errors++;
        }
      }
    // Counts only; no clinical records, tokens, messages or keys in response/logs.
    return json({ accepted, duplicatesOrStale, errors });
  } catch {
    return json({ error: "Reminder dispatch failed" }, 500);
  }
});
