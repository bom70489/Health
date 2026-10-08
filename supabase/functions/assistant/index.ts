import { createClient } from "npm:@supabase/supabase-js@2";
import { answerFromRecords } from "./logic.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer "))
    return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(auth.slice(7));
    if (authError || !user)
      return json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" }, 401);
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("id,role")
      .eq("id", user.id)
      .single();
    if (profileError || profile?.role !== "patient")
      return json(
        { error: "กรรตอบจากตารางส่วนตัวของผู้ป่วยที่เข้าสู่ระบบเท่านั้น" },
        403,
      );
    const body = await request.json();
    if (
      typeof body.question !== "string" ||
      !body.question.trim() ||
      body.question.length > 2000
    )
      return json({ error: "กรุณาพิมพ์คำถามไม่เกิน 2,000 ตัวอักษร" }, 400);
    // Ignore requested IDs/roles. Each query uses the verified identity AND RLS.
    const [a, m, c] = await Promise.all([
      userClient
        .from("appointments")
        .select(
          "id,scheduled_at,status,title,hospital_name,department,preparation_note",
        )
        .eq("patient_id", user.id),
      userClient
        .from("medication_plans")
        .select(
          "id,version,medicine_name,strength_value,strength_unit,amount_per_dose,amount_unit,meal_instruction,instructions,start_date,end_date,weekdays,time_slots,is_active",
        )
        .eq("patient_id", user.id),
      userClient
        .from("dose_confirmations")
        .select(
          "medication_plan_id,medication_plan_version,scheduled_at,corrected_at",
        )
        .eq("patient_id", user.id),
    ]);
    if (a.error || m.error || c.error)
      return json({ error: "อ่านตารางไม่ได้ กรุณาลองใหม่" }, 503);
    const answer = answerFromRecords(
      body.question,
      a.data ?? [],
      m.data ?? [],
      c.data ?? [],
    );
    const service = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const saved = await service
      .from("chat_messages")
      .insert({ patient_id: user.id, role: "assistant", text: answer });
    if (saved.error)
      return json({ error: "บันทึกคำตอบไม่ได้ กรุณาลองใหม่" }, 503);
    return json({ answer, engine: "deterministic", grounded: true });
  } catch {
    return json({ error: "กรรยังตอบไม่ได้ กรุณาลองใหม่" }, 500);
  }
});
