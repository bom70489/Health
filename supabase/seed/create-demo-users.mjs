// Run ONLY on a synthetic-data Supabase project, in a trusted terminal.
// Passwords and service credentials come from environment; never print them.
import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name];
  if (!value)
    throw new Error(`Missing server-side environment variable: ${name}`);
  return value;
}
if (required("GAN_ALLOW_SYNTHETIC_SEED") !== "true")
  throw new Error(
    "Set GAN_ALLOW_SYNTHETIC_SEED=true for a dedicated synthetic-data project",
  );
const client = createClient(
  required("SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const checked = (result) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};
async function account(prefix, role, displayName, extra) {
  const email = required(`${prefix}_EMAIL`),
    password = required(`${prefix}_PASSWORD`);
  if (password.length < 12)
    throw new Error(`${prefix}_PASSWORD must contain at least 12 characters`);
  // Existing accounts keep passwords and saved orders. Use a dedicated test project.
  const users = checked(
    await client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ).users;
  let user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user)
    user = checked(
      await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
    ).user;
  if (!user) throw new Error(`Could not create ${prefix}`);
  checked(
    await client
      .from("profiles")
      .upsert({
        id: user.id,
        role,
        display_name: displayName,
        hospital_name: "โรงพยาบาลสาธิตสมมติ",
        department: "คลินิกสาธิต",
        ...extra,
      }),
  );
  console.log(`${role} account ready: ${email}`);
  return user.id;
}
const doctor = await account("GAN_DOCTOR", "doctor", "นพ. ธนกร ตัวอย่าง", {});
const patientA = await account("GAN_PATIENT_A", "patient", "นางสมใจ ตัวอย่าง", {
  patient_number: "DEMO-001",
  age: 72,
  emergency_contact: "ข้อมูลติดต่อสมมติสำหรับการสาธิต",
});
const patientB = await account(
  "GAN_PATIENT_B",
  "patient",
  "นายวิชัย ตัวอย่าง",
  { patient_number: "DEMO-002", age: 68 },
);
checked(
  await client.from("doctor_patients").upsert([
    { doctor_id: doctor, patient_id: patientA },
    { doctor_id: doctor, patient_id: patientB },
  ]),
);
if (process.env.GAN_UNRELATED_DOCTOR_EMAIL)
  await account("GAN_UNRELATED_DOCTOR", "doctor", "แพทย์นอกทีมสาธิต", {});

const local = new Date(Date.now() + 7 * 3600000),
  day = local.toISOString().slice(0, 10);
const futureDay = new Date(local.getTime() + 2 * 86400000)
  .toISOString()
  .slice(0, 10);
const earlier = new Date(local.getTime() - 3600000).toISOString().slice(11, 16);
const later = new Date(local.getTime() + 3600000).toISOString().slice(11, 16);
async function insertIfMissing(table, record) {
  const present = checked(
    await client.from(table).select("id").eq("id", record.id).maybeSingle(),
  );
  if (!present) checked(await client.from(table).insert(record));
}
await insertIfMissing("appointments", {
  id: "11111111-1111-4111-8111-111111111111",
  patient_id: patientA,
  doctor_id: doctor,
  last_updated_by: doctor,
  title: "ติดตามรายการสุขภาพ (ข้อมูลสาธิต)",
  scheduled_at: new Date(`${futureDay}T14:00:00+07:00`).toISOString(),
  hospital_name: "โรงพยาบาลสาธิตสมมติ",
  department: "คลินิกสาธิต",
  location_detail: "อาคารสมมติ ชั้น 1",
  preparation_note: "นำรายการยาที่บันทึกในแอปมาแสดง (คำแนะนำสมมติ)",
  status: "scheduled",
  version: 1,
});
await insertIfMissing("appointments", {
  id: "22222222-2222-4222-8222-222222222222",
  patient_id: patientB,
  doctor_id: doctor,
  last_updated_by: doctor,
  title: "นัดของผู้ป่วยสาธิต B",
  scheduled_at: new Date(`${futureDay}T10:00:00+07:00`).toISOString(),
  hospital_name: "โรงพยาบาลสาธิตสมมติ B",
  department: "คลินิกสมมติ B",
  status: "scheduled",
  version: 1,
});
for (const [patient, id, name, slots] of [
  [
    patientA,
    "33333333-3333-4333-8333-333333333333",
    "ยาสาธิต A (ไม่ใช่คำสั่งรักษาจริง)",
    [earlier, later],
  ],
  [
    patientB,
    "44444444-4444-4444-8444-444444444444",
    "ยาสาธิต B (ไม่ใช่คำสั่งรักษาจริง)",
    ["09:30"],
  ],
]) {
  await insertIfMissing("medication_plans", {
    id,
    patient_id: patient,
    doctor_id: doctor,
    last_updated_by: doctor,
    medicine_name: name,
    amount_per_dose: "1",
    amount_unit: "หน่วยสาธิต",
    meal_instruction: "after",
    instructions: "ข้อมูลสมมติสำหรับทดสอบแอปเท่านั้น",
    start_date: day,
    time_slots: [...new Set(slots)],
    time_zone: "Asia/Bangkok",
    is_active: true,
    reminders_enabled: true,
    version: 1,
  });
}
console.log(
  "Synthetic profiles, assignments and sample orders ready. Existing order edits and passwords were preserved.",
);
