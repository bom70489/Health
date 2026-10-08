// Optional real Supabase API security test. Requires synthetic accounts only.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const required = (name) => {
  if (!process.env[name])
    throw new Error(`Missing ${name}; this live test was NOT run`);
  return process.env[name];
};
const url = required("SUPABASE_URL"),
  anonKey = required("SUPABASE_ANON_KEY");
const client = () =>
  createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const ok = (result) => {
  assert.equal(result.error, null, result.error?.message);
  return result.data;
};
const mustDeny = async (result) =>
  assert.ok(
    result.error || (Array.isArray(result.data) && result.data.length === 0),
    "Unauthorized operation unexpectedly succeeded",
  );
async function login(prefix) {
  const c = client();
  const data = ok(
    await c.auth.signInWithPassword({
      email: required(`${prefix}_EMAIL`),
      password: required(`${prefix}_PASSWORD`),
    }),
  );
  return { c, id: data.user.id };
}
const doctor = await login("GAN_DOCTOR"),
  a = await login("GAN_PATIENT_A"),
  b = await login("GAN_PATIENT_B");
const anonymous = client();
await mustDeny(await anonymous.from("appointments").select("*"));
await mustDeny(await anonymous.from("medication_plans").select("*"));
await mustDeny(
  await a.c.from("profiles").update({ role: "doctor" }).eq("id", a.id).select(),
);
for (const table of ["appointments", "medication_plans", "dose_confirmations"])
  assert.equal(
    ok(await a.c.from(table).select("*").eq("patient_id", b.id)).length,
    0,
  );
console.log("PASS: anonymous denial, protected roles and cross-patient SELECT");
const now = new Date(),
  day = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
const time = new Date(now.getTime() + 7 * 3600000).toISOString().slice(11, 16),
  scheduled = new Date(`${day}T${time}:00+07:00`).toISOString();
const inputA = {
  patient_id: a.id,
  title: "นัดทดสอบ API สาธิต",
  scheduled_at: new Date(now.getTime() + 3 * 86400000).toISOString(),
  hospital_name: "โรงพยาบาลสมมติ API",
  department: "แผนกทดสอบ",
  status: "scheduled",
  reminders_enabled: false,
  doctor_id: b.id,
  version: 999,
};
const inputM = {
  patient_id: a.id,
  medicine_name: "ยาทดสอบ API (ไม่ใช่คำสั่งรักษาจริง)",
  amount_per_dose: "1",
  amount_unit: "หน่วยสาธิต",
  meal_instruction: "after",
  start_date: day,
  time_slots: [time],
  is_active: true,
  reminders_enabled: false,
};
let appointment, medication;
try {
  appointment = ok(await doctor.c.rpc("save_appointment", { p_input: inputA }));
  medication = ok(await doctor.c.rpc("save_medication", { p_input: inputM }));
  const record = ok(
    await doctor.c
      .from("appointments")
      .select("*")
      .eq("id", appointment)
      .single(),
  );
  assert.equal(record.doctor_id, doctor.id);
  assert.equal(record.version, 1);
  await mustDeny(
    await a.c
      .from("appointments")
      .update({ scheduled_at: now.toISOString() })
      .eq("id", appointment)
      .select(),
  );
  await mustDeny(
    await a.c
      .from("medication_plans")
      .update({ amount_per_dose: "100" })
      .eq("id", medication)
      .select(),
  );
  await mustDeny(await a.c.rpc("cancel_appointment", { p_id: appointment }));
  await mustDeny(
    await b.c.rpc("acknowledge_appointment", {
      p_id: appointment,
      p_version: 1,
    }),
  );
  await mustDeny(
    await b.c.rpc("confirm_dose", {
      p_plan_id: medication,
      p_version: 1,
      p_scheduled_at: scheduled,
    }),
  );
  ok(
    await a.c.rpc("confirm_dose", {
      p_plan_id: medication,
      p_version: 1,
      p_scheduled_at: scheduled,
    }),
  );
  ok(
    await a.c.rpc("confirm_dose", {
      p_plan_id: medication,
      p_version: 1,
      p_scheduled_at: scheduled,
    }),
  );
  assert.equal(
    ok(
      await a.c
        .from("dose_confirmations")
        .select("*")
        .eq("medication_plan_id", medication),
    ).length,
    1,
  );
  ok(
    await a.c.rpc("acknowledge_appointment", {
      p_id: appointment,
      p_version: 1,
    }),
  );
  ok(
    await doctor.c.rpc("save_appointment", {
      p_id: appointment,
      p_input: { ...inputA, preparation_note: "ข้อมูลทดสอบใหม่" },
    }),
  );
  const updated = ok(
    await a.c.from("appointments").select("*").eq("id", appointment).single(),
  );
  assert.equal(updated.version, 2);
  assert.equal(updated.acknowledged_version, null);
  await mustDeny(
    await a.c.rpc("acknowledge_appointment", {
      p_id: appointment,
      p_version: 1,
    }),
  );
  ok(
    await doctor.c.rpc("save_medication", {
      p_id: medication,
      p_input: { ...inputM, instructions: "ทดสอบเวอร์ชันใหม่" },
    }),
  );
  await mustDeny(
    await a.c.rpc("confirm_dose", {
      p_plan_id: medication,
      p_version: 1,
      p_scheduled_at: scheduled,
    }),
  );
  console.log(
    "PASS: clinical write denials, server provenance/version, duplicate and stale doses, acknowledgment reset",
  );
  if (process.env.GAN_UNRELATED_DOCTOR_EMAIL) {
    const unrelated = await login("GAN_UNRELATED_DOCTOR");
    assert.equal(
      ok(
        await unrelated.c
          .from("appointments")
          .select("*")
          .eq("id", appointment),
      ).length,
      0,
    );
    await mustDeny(
      await unrelated.c.rpc("cancel_appointment", { p_id: appointment }),
    );
    console.log("PASS: unrelated doctor denied");
    await unrelated.c.auth.signOut({ scope: "local" });
  } else
    console.log(
      "UNTESTED: unrelated doctor API (configure GAN_UNRELATED_DOCTOR_EMAIL/PASSWORD)",
    );
  if (process.env.GAN_TEST_EDGE === "true") {
    const answer = ok(
      await a.c.functions.invoke("assistant", {
        body: {
          question: "วันนี้ต้องกินยาอะไรบ้าง",
          patientId: b.id,
          role: "doctor",
        },
      }),
    );
    assert.equal(answer.engine, "deterministic");
    assert.ok(answer.answer.includes(inputM.medicine_name));
    await mustDeny(
      await anonymous.functions.invoke("assistant", {
        body: { question: "ตารางยา" },
      }),
    );
    await mustDeny(
      await doctor.c.functions.invoke("assistant", {
        body: { question: "ตารางยา" },
      }),
    );
    console.log(
      "PASS: authenticated assistant ignores supplied identity and denies doctor/anonymous contexts",
    );
  } else
    console.log("UNTESTED: deployed Edge Function (set GAN_TEST_EDGE=true)");
} finally {
  if (appointment)
    ok(await doctor.c.rpc("cancel_appointment", { p_id: appointment }));
  if (medication)
    ok(await doctor.c.rpc("deactivate_medication", { p_id: medication }));
  for (const account of [doctor, a, b])
    await account.c.auth.signOut({ scope: "local" });
}
console.log(
  "Live security checks completed. Test records remain in cancelled/inactive audit history.",
);
