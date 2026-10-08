import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Runs actual PostgreSQL SQL/RLS/RPCs in WASM, with a minimal Supabase Auth shim.
// Cloud gateway/JWT/network/FCM behavior still requires the documented live tests.
const ids = {
  doctor: "00000000-0000-4000-8000-000000000001",
  unrelated: "00000000-0000-4000-8000-000000000002",
  collaborator: "00000000-0000-4000-8000-000000000003",
  patientA: "00000000-0000-4000-8000-000000000004",
  patientB: "00000000-0000-4000-8000-000000000005",
};
let db: PGlite;
const query = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) => (await db.query<T>(sql, params)).rows;
async function identity(id: string, role = "authenticated") {
  await db.exec(`reset role; set role ${role}`);
  await query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function denied(sql: string, params: unknown[] = []) {
  await db.exec("savepoint denial");
  try {
    await expect(db.query(sql, params)).rejects.toBeDefined();
  } finally {
    await db.exec("rollback to savepoint denial; release savepoint denial");
  }
}
const appointmentInput = (patient = ids.patientA) => ({
  patient_id: patient,
  title: "นัดสาธิต",
  scheduled_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  hospital_name: "โรงพยาบาลสมมติ",
  department: "แผนกสาธิต",
  status: "scheduled",
  reminders_enabled: true,
});
async function createAppointment(patient = ids.patientA) {
  const rows = await query<{ id: string }>(
    "select public.save_appointment($1::jsonb,null) as id",
    [JSON.stringify(appointmentInput(patient))],
  );
  return rows[0].id;
}
async function createMedication(patient = ids.patientA) {
  const [clock] = await query<{
    day: string;
    time: string;
    future: string;
    instant: string;
  }>(
    "select to_char(now() at time zone 'Asia/Bangkok','YYYY-MM-DD') as day,to_char(now() at time zone 'Asia/Bangkok','HH24:MI') as time,to_char((now() + interval '45 minutes') at time zone 'Asia/Bangkok','HH24:MI') as future,date_trunc('minute',now())::text as instant",
  );
  const input = {
    patient_id: patient,
    medicine_name: "ยาสาธิต",
    amount_per_dose: "1",
    amount_unit: "หน่วยสาธิต",
    meal_instruction: "after",
    start_date: clock.day,
    time_slots: [clock.time, clock.future],
    is_active: true,
    reminders_enabled: true,
  };
  const [row] = await query<{ id: string }>(
    "select public.save_medication($1::jsonb,null) as id",
    [JSON.stringify(input)],
  );
  return { id: row.id, instant: clock.instant, input };
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for (const file of [
    "202610080001_health.sql",
    "202610080002_reminders.sql",
  ]) {
    // PG has gen_random_uuid built in; PGlite does not bundle pgcrypto extension.
    const sql = readFileSync(
      resolve("supabase/migrations", file),
      "utf8",
    ).replace("create extension if not exists pgcrypto;", "");
    await db.exec(sql);
  }
  for (const [key, id] of Object.entries(ids)) {
    await query("insert into auth.users(id) values($1)", [id]);
    await query(
      "insert into public.profiles(id,role,display_name) values($1,$2,$3)",
      [id, key.startsWith("patient") ? "patient" : "doctor", key],
    );
  }
  await query(
    "insert into public.doctor_patients(doctor_id,patient_id) values($1,$2),($1,$3),($4,$2)",
    [ids.doctor, ids.patientA, ids.patientB, ids.collaborator],
  );
}, 60000);
beforeEach(async () => {
  await db.exec("reset role; begin");
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});
afterAll(async () => {
  await db.close();
});

describe("Supabase PostgreSQL access boundaries", () => {
  it("supports server-admin Auth seeding while enforcing initial versions and valid medicine values", async () => {
    await identity("", "service_role");
    await query(
      "insert into public.medication_plans(patient_id,doctor_id,last_updated_by,medicine_name,amount_per_dose,amount_unit,meal_instruction,start_date,time_slots) values($1,$2,$2,'รายการสาธิต','1','หน่วย','after',current_date,array['08:00','20:00'])",
      [ids.patientA, ids.doctor],
    );
    await denied(
      "insert into public.medication_plans(patient_id,doctor_id,last_updated_by,medicine_name,amount_per_dose,amount_unit,meal_instruction,start_date,time_slots,version) values($1,$2,$2,'สาธิต','1','หน่วย','after',current_date,array['08:00'],99)",
      [ids.patientA, ids.doctor],
    );
    await denied(
      "insert into public.medication_plans(patient_id,doctor_id,last_updated_by,medicine_name,amount_per_dose,amount_unit,meal_instruction,start_date,time_slots) values($1,$2,$2,'สาธิต','0','หน่วย','after',current_date,array['25:00'])",
      [ids.patientA, ids.doctor],
    );
    await denied(
      "insert into public.medication_plans(patient_id,doctor_id,last_updated_by,medicine_name,amount_per_dose,amount_unit,meal_instruction,start_date,time_slots) values($1,$2,$2,'สาธิต','1','หน่วย','after','infinity'::date,array['08:00'])",
      [ids.patientA, ids.doctor],
    );
    await denied(
      "insert into public.appointments(patient_id,doctor_id,last_updated_by,title,scheduled_at,hospital_name,department) values($1,$2,$2,'สาธิต','infinity'::timestamptz,'โรงพยาบาลสมมติ','แผนกสาธิต')",
      [ids.patientA, ids.doctor],
    );
  });
  it("denies anonymous access and protects server-owned roles/assignments", async () => {
    await identity(ids.patientA);
    await denied("update public.profiles set role='doctor' where id=$1", [
      ids.patientA,
    ]);
    await denied(
      "insert into public.doctor_patients(doctor_id,patient_id) values($1,$2)",
      [ids.patientA, ids.patientB],
    );
    await identity("", "anon");
    await denied("select * from public.profiles");
    await denied("select * from public.appointments");
    await denied("select public.save_appointment($1::jsonb,null)", [
      JSON.stringify(appointmentInput()),
    ]);
  });
  it("keeps patient data separate even when UUIDs are known", async () => {
    await identity(ids.doctor);
    const a = await createAppointment(),
      b = await createAppointment(ids.patientB);
    await createMedication(ids.patientA);
    await createMedication(ids.patientB);
    await identity(ids.patientA);
    expect(
      (await query("select id from public.appointments")).map((r) => r.id),
    ).toEqual([a]);
    expect(
      await query("select id from public.appointments where id=$1", [b]),
    ).toEqual([]);
    expect(
      (await query("select patient_id from public.medication_plans")).every(
        (r) => r.patient_id === ids.patientA,
      ),
    ).toBe(true);
    expect(
      await query("select id from public.profiles where id=$1", [ids.patientB]),
    ).toEqual([]);
    await denied("select public.acknowledge_appointment($1,1)", [b]);
  });
  it("rejects patient direct clinical writes and doctor RPC bypasses", async () => {
    await identity(ids.doctor);
    const a = await createAppointment(),
      m = await createMedication();
    await identity(ids.patientA);
    await denied("update public.appointments set title='forged' where id=$1", [
      a,
    ]);
    await denied(
      "update public.medication_plans set amount_per_dose='100' where id=$1",
      [m.id],
    );
    await denied("delete from public.medication_plans where id=$1", [m.id]);
    await denied("select public.save_appointment($1::jsonb,$2)", [
      JSON.stringify(appointmentInput()),
      a,
    ]);
    await denied("select public.deactivate_medication($1)", [m.id]);
  });
  it("prevents an unrelated doctor from reading or changing assigned records", async () => {
    await identity(ids.doctor);
    const a = await createAppointment(),
      m = await createMedication();
    await identity(ids.unrelated);
    expect(await query("select * from public.appointments")).toEqual([]);
    expect(await query("select * from public.medication_plans")).toEqual([]);
    expect(
      await query("select id from public.profiles where role='patient'"),
    ).toEqual([]);
    await denied("select public.cancel_appointment($1)", [a]);
    await denied("select public.save_medication($1::jsonb,$2)", [
      JSON.stringify(m.input),
      m.id,
    ]);
  });
  it("ignores forged creator/version and preserves provenance on collaborator edits", async () => {
    await identity(ids.doctor);
    const input = {
      ...appointmentInput(),
      doctor_id: ids.unrelated,
      version: 99,
    };
    const [created] = await query<{ id: string }>(
      "select public.save_appointment($1::jsonb,null) as id",
      [JSON.stringify(input)],
    );
    let [record] = await query(
      "select doctor_id,version from public.appointments where id=$1",
      [created.id],
    );
    expect(record).toMatchObject({ doctor_id: ids.doctor, version: 1 });
    await identity(ids.collaborator);
    await query("select public.save_appointment($1::jsonb,$2)", [
      JSON.stringify({ ...input, title: "แก้ไขสาธิต", version: 1 }),
      created.id,
    ]);
    [record] = await query(
      "select doctor_id,last_updated_by,version from public.appointments where id=$1",
      [created.id],
    );
    expect(record).toMatchObject({
      doctor_id: ids.doctor,
      last_updated_by: ids.collaborator,
      version: 2,
    });
  });
  it("acknowledges only current own appointment and invalidates acknowledgment on edits", async () => {
    await identity(ids.doctor);
    const a = await createAppointment();
    await identity(ids.patientA);
    await query("select public.acknowledge_appointment($1,1)", [a]);
    expect(
      (
        await query(
          "select acknowledged_version from public.appointments where id=$1",
          [a],
        )
      )[0].acknowledged_version,
    ).toBe(1);
    await identity(ids.doctor);
    await query("select public.save_appointment($1::jsonb,$2)", [
      JSON.stringify({
        ...appointmentInput(),
        preparation_note: "คำแนะนำใหม่",
      }),
      a,
    ]);
    await identity(ids.patientA);
    const [record] = await query(
      "select version,acknowledged_version,acknowledged_at from public.appointments where id=$1",
      [a],
    );
    expect(record).toEqual({
      version: 2,
      acknowledged_version: null,
      acknowledged_at: null,
    });
    await denied("select public.acknowledge_appointment($1,1)", [a]);
    await query("select public.acknowledge_appointment($1,2)", [a]);
  });
  it("dedupes exact dose instances, rejects fabricated/future/other-patient occurrences, and records corrections", async () => {
    await identity(ids.doctor);
    const m = await createMedication();
    await identity(ids.patientB);
    await denied("select public.confirm_dose($1,1,$2)", [m.id, m.instant]);
    await identity(ids.patientA);
    await query("select public.confirm_dose($1,1,$2)", [m.id, m.instant]);
    await query("select public.confirm_dose($1,1,$2)", [m.id, m.instant]);
    const rows = await query("select * from public.dose_confirmations");
    expect(rows).toHaveLength(1);
    expect(rows[0].occurrence_key).toBe(
      `${m.id}:1:${new Date(m.instant).toISOString()}`,
    );
    await denied(
      "select public.confirm_dose($1,1,$2::timestamptz + interval '1 second')",
      [m.id, m.instant],
    );
    await denied(
      "select public.confirm_dose($1,1,$2::timestamptz + interval '45 minutes')",
      [m.id, m.instant],
    );
    await denied(
      "insert into public.dose_confirmations select * from public.dose_confirmations",
    );
    await query("select public.correct_dose($1)", [rows[0].occurrence_key]);
    expect(
      (await query("select corrected_at from public.dose_confirmations"))[0]
        .corrected_at,
    ).not.toBeNull();
    await query("select public.confirm_dose($1,1,$2)", [m.id, m.instant]);
    expect(
      (await query("select corrected_at from public.dose_confirmations"))[0]
        .corrected_at,
    ).toBeNull();
  });
  it("rejects stale schedule versions and keeps historical confirmations/audit revisions", async () => {
    await identity(ids.doctor);
    const m = await createMedication();
    await identity(ids.patientA);
    await query("select public.confirm_dose($1,1,$2)", [m.id, m.instant]);
    await identity(ids.doctor);
    await query("select public.save_medication($1::jsonb,$2)", [
      JSON.stringify({ ...m.input, instructions: "คำสั่งสาธิตใหม่" }),
      m.id,
    ]);
    await identity(ids.patientA);
    await denied("select public.confirm_dose($1,1,$2)", [m.id, m.instant]);
    await query("select public.confirm_dose($1,2,$2)", [m.id, m.instant]);
    expect(
      await query(
        "select medication_plan_version from public.dose_confirmations order by medication_plan_version",
      ),
    ).toEqual([{ medication_plan_version: 1 }, { medication_plan_version: 2 }]);
    expect(
      await query(
        "select version from public.order_revisions where kind='medication' order by version",
      ),
    ).toEqual([{ version: 1 }, { version: 2 }]);
  });
  it("keeps push tokens bound to users and makes reminder claims service-only and idempotent", async () => {
    await identity(ids.doctor);
    const m = await createMedication();
    await identity(ids.patientA);
    await query("select public.register_device_token($1,$2)", [
      "ExpoPushToken[test_device]",
      "test-device",
    ]);
    await query("select public.register_device_token($1,$2)", [
      "ExpoPushToken[other_phone]",
      "other-phone",
    ]);
    const [device] = await query(
      "select id from public.device_tokens where device_id=$1",
      ["test-device"],
    );
    await denied("select public.claim_reminder('medication',$1,1,$2,$3)", [
      m.id,
      m.instant,
      device.id,
    ]);
    await identity(ids.patientB);
    await denied("select public.register_device_token($1,$2)", [
      "ExpoPushToken[test_device]",
      "test-device",
    ]);
    await identity("", "service_role");
    const [first] = await query(
      "select public.claim_reminder('medication',$1,1,$2,$3) as key",
      [m.id, m.instant, device.id],
    );
    expect(first.key).toBeTruthy();
    expect(
      (
        await query(
          "select public.claim_reminder('medication',$1,1,$2,$3) as key",
          [m.id, m.instant, device.id],
        )
      )[0].key,
    ).toBeNull();
    expect(
      (
        await query(
          "select public.claim_reminder('medication',$1,999,$2,$3) as key",
          [m.id, m.instant, device.id],
        )
      )[0].key,
    ).toBeNull();
    await identity(ids.patientA);
    await query("select public.unregister_device_tokens($1)", ["test-device"]);
    expect(
      (await query("select device_id from public.device_tokens")).map(
        (r) => r.device_id,
      ),
    ).toEqual(["other-phone"]);
    expect(
      (
        await query(
          "select device_token_id from public.notification_deliveries",
        )
      )[0].device_token_id,
    ).toBeNull();
    await query("select public.register_device_token($1,$2)", [
      "ExpoPushToken[test_device]",
      "test-device",
    ]);
    const [renewedDevice] = await query(
      "select id from public.device_tokens where device_id=$1",
      ["test-device"],
    );
    await identity("", "service_role");
    expect(
      (
        await query(
          "select public.claim_reminder('medication',$1,1,$2,$3) as key",
          [m.id, m.instant, renewedDevice.id],
        )
      )[0].key,
    ).toBeNull();
  });
  it("does not let clients forge assistant provenance or read another patient chat", async () => {
    await identity(ids.patientA);
    await query("select public.append_chat_message($1,$2)", [
      "00000000-0000-4000-8000-000000000099",
      "ตารางยาวันนี้",
    ]);
    expect((await query("select role from public.chat_messages"))[0].role).toBe(
      "user",
    );
    await denied(
      "insert into public.chat_messages(patient_id,role,text) values($1,'assistant','forged')",
      [ids.patientA],
    );
    await identity(ids.patientB);
    expect(await query("select * from public.chat_messages")).toEqual([]);
    await identity(ids.doctor);
    expect(await query("select * from public.chat_messages")).toEqual([]);
  });
});
