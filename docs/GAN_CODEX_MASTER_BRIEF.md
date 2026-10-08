# CODEX MASTER BUILD BRIEF — กรร | AI Health Companion

**Project:** AI FOR ALL Hackathon 2026 — Theme 4: Health & Aging Society  
**Target:** An actually runnable, portrait-oriented **Android-first React Native mobile prototype**  
**Working title:** **กรร | AI Health Companion** (the older draft also used “Checkin”)  
**Interface language:** **Thai first**; internal code, comments, and developer documentation may be English  
**Team:** Ming and teammates including Bomb  
**Timezone:** `Asia/Bangkok`  
**Primary implementation stack:** React Native + Expo + TypeScript + Expo Router + Supabase  
**Instruction to Codex:** **IMPLEMENT THE APP. DO NOT STOP AFTER MAKING A PLAN, WIREFRAMES, OR EMPTY PLACEHOLDER SCREENS.**

---

## 0. YOUR MISSION AS THE CODING AGENT (READ FIRST)

You are the lead implementation engineer, mobile UI engineer, and pragmatic QA engineer for a Thai student hackathon team's first functional prototype. The team has limited time. Build the best **working, coherent, accessible, demonstrable application** possible in the repository available to you.

**Required behavior:**

1. Inspect the existing project directory and dependencies before modifying it. If this repository already contains an app, preserve working code and integrate rather than destructively restarting. Otherwise, scaffold a fresh Expo + TypeScript + Expo Router app.
2. Read the entire brief and inspect all reference images under `ui-references/` if available.
3. Implement real screen components, navigation, state, validation, CRUD flows, persistence, role separation, dynamic next-task logic, and at least useful deterministic AI-assistant demo answers. Don't only generate a design system.
4. Choose a small, robust set of libraries compatible with the current Expo SDK. Prefer `npx expo install` for Expo-native packages and their matched versions. Consult official docs if APIs differ from this brief.
5. Provide **two honest modes**:
   - **Instant Demo Mode:** runs without external credentials using a bundled fake dataset, persistent local demo storage if practical, and a clearly visible `โหมดสาธิต` label. Both doctor and patient journeys must be interactively testable on one device. This is **not a secure clinical system**.
   - **Supabase Mode:** when configured with valid Supabase credentials and migrations/seed setup, authenticates and persists real demo records with correctly enforced role-based database permissions. It must be designed and implemented, not merely described.
6. Do not silently pretend that an unconfigured service works. If Supabase, push credentials, or LLM credentials are absent, use explicitly labeled local demo equivalents and document which parts are simulated.
7. Create SQL migrations, any server/Edge Functions necessary, seed instructions, `.env.example`, and a readable setup/test `README.md`.
8. Run dependency installation, TypeScript checks, Expo project diagnostics if available, and any runnable tests. Fix errors you can fix. If a physical Android device or secrets are unavailable, report that as **untested**, never as passed.
9. Complete the highest-priority vertical slice first: **doctor inputs data → patient sees it → patient confirms medication → next-task card updates → กรร answers from the same records**. Continue with lower priorities afterward.
10. Make reasonable engineering decisions yourself. Don't pause to ask aesthetic or routine implementation questions. Ask only if a truly blocking external credential or destructive irreversible choice is unavoidable; otherwise deliver the best functional demo.
11. At the end, print the exact commands to launch the app and demo both roles; summarize what is working, what is a demo stub, and anything genuinely blocked.

**Definition of success:** a student can open the app on an Android phone or emulator, interact with a polished Thai UI, enter appointments and medication schedules from a **doctor account reached through บัญชี**, switch to a **patient demo account**, immediately see the doctor's entries in a calendar and prominent next-task panel, confirm whether a dose was taken, and ask **กรร** about the actual saved schedule. A configured Supabase deployment must enforce the same access boundaries server-side.

**Do not claim that one prompt automatically makes the app production-ready, safe for real patients, or fully validated.** This is a hackathon prototype built with synthetic patient data only.

---

## 1. FINAL TEAM DECISIONS: THESE OVERRIDE THE OLDER BOMB DOCUMENT

The attached `LEGACY_BOMB_PLAN.md` is useful for technical background, the 20-day schedule, and original security/Expo/Supabase decisions; **however its October 7 scope has been superseded by the team's newer agreement**.

| Decision | CURRENT AND AUTHORITATIVE |
|---|---|
| Core concept | Doctor-controlled health calendar + medication reminders + a simple AI assistant named **กรร**. |
| Users | Patient (including elderly Thai users) and doctor/authorized clinical staff. |
| App count | **One mobile app**, not separate patient and doctor apps, and no separate doctor website. |
| Doctor controls | Doctor creates, edits, reschedules, and cancels appointments; enters and adjusts prescribed medication schedules and instructions. |
| Patient controls | Patient reads their own information, confirms/records when medicine was taken, reads/acknowledges appointment details, and chats with กรร. Patient **cannot** modify doctor-authored appointment or prescription instructions. |
| Assistant controls | กรร helps explain and retrieve information but cannot prescribe, discontinue, reschedule, change dosage, or secretly mutate doctor-entered records. |
| Medications in MVP | **YES**, unlike the old plan that excluded them. Include medication schedules, reminders, and patient confirmation. |
| Manual data entry | **YES**, all doctor information is typed manually in Phase 1. No OCR/photo extraction yet. |
| Future Phase 2 | Optional prescription/appointment image scanning with AI/OCR, doctor verification before save, improved voice-based and proactive AI assistance. **Not required for the first prototype.** |
| Look and feel | **White and blue**, Thai-first, clean and recognizable, especially a **LINE-inspired chat**. Never copy LINE trademarks or exact branding. |
| Orientation | **Portrait/vertical mobile phone**. |
| Navigation | **Thin permanent LEFT navigation rail** with กรร and ปฏิทิน near the top and บัญชี at the bottom. This is intentional, even though bottom tabs are common on phones. |
| Doctor entry point | The **บัญชี / Account** section. Do not add a fourth top-level “Doctor” navigation item. |
| First landing | For signed-in patients, default to **ปฏิทิน** and its “สิ่งที่ต้องทำถัดไป” card. For doctors, account/management landing is acceptable, while the same 3-item rail remains present. |
| Timeline | Roughly 20 development days (Oct 16–Nov 4, 2026); prioritize demo-ready functionality and simplicity. |

**The key distinction between phases:** Phase 1 prioritizes **doctor authority and reliable reminders**, not autonomous AI decisions. A richer “AI actively manages my healthcare” vision is future work and still requires clinician approval for medical changes.

---

## 2. PERSONAS, USER STORIES, AND UX NON-NEGOTIABLES

### Patient persona

An older Thai adult who may be comfortable with LINE messages but unfamiliar with complex menus. They want to know: **What do I need to do next? What medicine was my doctor telling me to take? Where and when is my next appointment? Did I already mark my dose as taken?** They should not have to scan a dense monthly calendar to answer these.

### Doctor persona

A medical professional or authorized clinical staff member who logs into the same mobile app and uses **บัญชี** to search assigned patients, manually create/modify appointments, and enter/modify medication instructions. They are the source of truth for clinical scheduling information in the MVP.

### Core usability principles

- Thai words everywhere in patient-visible UI; natural Thai rather than a literal English translation.
- Big tap targets: **at least 44–48 dp**; labels alongside icons, not icon-only controls wherever space permits.
- Legible Thai system fonts; body generally 16–18 sp, headings 20–26 sp, next-task time 30–36 sp. Honor Android large-font settings where practical.
- High contrast dark navy text on white/pale blue, minimal clutter, ample spacing and obvious active states.
- Avoid medical abbreviations as the only labels; use simple descriptions and progressive detail disclosure.
- Do not convey state by color alone: show `รับประทานแล้ว`, `ยังไม่ได้รับประทาน`, `เกินเวลา`, `ยกเลิก`, etc.
- Scrollable content inside the main content area; left navigation remains pinned.
- Proper safe-area and keyboard behavior, especially on narrow Android portrait screens (e.g., 360 × 800 dp). Don't hide message input or save buttons under the keyboard.
- Display empty states, loading states, field validation errors, network errors, notification-permission explanations, and meaningful success feedback.
- Never delete the user’s important medical record just because a reminder time has passed.
- Make doctor-entered instructions visually distinguishable from general chatbot information.

---

## 3. REFERENCE IMAGES AND VISUAL PRIORITY

Reference files, if present in the repository:

- `ui-references/01-gan-chat.png` — main patient **กรร** chat: blue/white vertical layout, left rail, messaging bubbles, friendly AI character, suggested questions, bottom input.
- `ui-references/02-calendar-next-task.png` — **ปฏิทิน**: prominent “สิ่งที่ต้องทำถัดไป” card at top, concise week selector, day entries with tick boxes, upcoming appointments.
- `ui-references/03-doctor-under-account.png` — **บัญชี** as the gateway to doctor management; patient and doctor account menus, doctor patient list, appointments and prescriptions.

Images are **visual inspiration, not an exact product specification**. Some illustrations include sample drug names and dates which must be treated as mock content, not verified patient data. Product rules in this document take priority if any image conflicts. Do not hardcode sample content into the UI instead of showing actual app state.

### Design tokens (starting point)

```ts
export const theme = {
  colors: {
    primary: '#2878D0',
    primaryDark: '#135BA8',
    primarySoft: '#EAF4FF',
    canvas: '#F7FBFF',
    surface: '#FFFFFF',
    bubbleUser: '#D8ECFF',
    bubbleAssistant: '#FFFFFF',
    text: '#17314D',
    textMuted: '#637B95',
    border: '#D9E7F5',
    success: '#218B60',
    successSoft: '#E5F7ED',
    warning: '#A66316',
    warningSoft: '#FFF2DF',
    danger: '#BA3E4B',
    dangerSoft: '#FFF0F2',
  },
  radius: { sm: 10, md: 16, lg: 22 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  railWidth: 72,
};
```

Use the tokens consistently, but adjust contrast/accessibility as needed. Round, calm, professional cards; subtle shadows only. Icons can come from Expo-supported vector icons. Use a simple **original** small blue robot/face icon for กรร; if a source image is hard to crop or reuse appropriately, create a clean in-app vector/icon version instead of blocking the build.

---

## 4. APP NAVIGATION AND ROUTE MAP

**Global structure (all signed-in screens):**

```text
┌──────────────────────────────────┐
│  NAV RAIL    │   MAIN CONTENT   │
│             │                   │
│ 🤖 กรร      │   Current page    │
│             │                   │
│ 📅 ปฏิทิน   │                   │
│             │                   │
│             │                   │
│             │                   │
│ 👤 บัญชี    │                   │
└──────────────────────────────────┘
```

`กรร` and `ปฏิทิน` at the TOP of the rail; `บัญชี` pinned to the BOTTOM. Use Thai short labels under or next to the icons, consistent with the generated images. Active rail item: saturated primary blue rounded pill; inactive: light blue/white background and navy icon. Keep rail approximately 64–76 dp; main pane flexes to the remaining width.

Use **Expo Router** and a shared authenticated layout, e.g.:

```text
app/
  _layout.tsx                        # providers, auth/session setup
  index.tsx                          # redirect / launch according to session
  login.tsx                          # shared login; optional explicitly labeled demo-role entry
  (app)/
    _layout.tsx                      # persistent left rail, route guard
    assistant.tsx                    # กรร chat
    calendar/
      index.tsx                      # next action, day/week/month navigation
      appointment/[id].tsx          # appointment details + acknowledgment
      medication/[id].tsx           # prescribed medication detail & instructions
    account/
      index.tsx                      # patient's account OR doctor's account menu by role
      profile.tsx
      preferences.tsx
      doctor/
        patients/index.tsx          # assigned patient list/search
        patients/[id].tsx           # patient overview
        patients/[id]/appointments.tsx
        patients/[id]/medications.tsx
        appointments/new.tsx
        appointments/[id]/edit.tsx
        medications/new.tsx
        medications/[id]/edit.tsx
```

This is a suggested logical shape; route group nesting and layout details may vary to satisfy actual Expo Router constraints. Use safe, explicit navigation permissions. **The doctor screens remain children of Account navigation**, not a global fourth tab. Back navigation must be intuitive.

Auth decision:

- Everyone enters through shared login before protected data screens in Supabase Mode.
- In Demo Mode only, an obvious selector can log in as **แพทย์ (สาธิต)** or **ผู้ป่วย (สาธิต)** for quick judging demos. This is a fake simulated login, never a real authorization mechanism.
- In real Supabase mode, role comes from protected server/database membership, **not** from an editable client dropdown or a user-controlled flag.
- Doctor can open Account → `จัดการผู้ป่วย` / `จัดการนัดหมาย` / `จัดการยาและคำสั่งรักษา`.
- Patient Account must **not** display doctor management items.
- Every deep link/route re-checks role and data permissions. The server/RLS performs actual protection.

---

## 5. PATIENT SCREEN A — กรร CHAT (MOST IMPORTANT VISUAL REFERENCE)

### Screen layout

Header:

- Friendly original กรร avatar.
- Big title **กรร** and subtitle **ผู้ช่วยสุขภาพของคุณ**.
- Small badge **อ้างอิงข้อมูลจากแพทย์** for answers based on doctor-authored schedules, not a false general “all information medically verified” claim.
- Avoid stacking so many controls that the chat becomes too narrow.

Conversation area:

- Familiar LINE-like messaging pattern **without copying LINE branding**.
- Assistant messages on left, white bubble, avatar beside them.
- Patient messages on right, pale-blue bubble.
- Time labels in small muted Thai-friendly text; timestamps optional but consistent.
- Long Thai strings wrap normally and text remains selectable if feasible.
- New conversation may show a welcome assistant message and three large tap-to-ask chips/cards:
  1. `วันนี้ต้องกินยาอะไรบ้าง?`
  2. `นัดหมอครั้งต่อไปเมื่อไร?`
  3. `ยานี้มีผลข้างเคียงอะไร?`
- Put text-based safeguards in user-friendly language, e.g. `กรรให้ข้อมูลประกอบ ไม่สามารถเปลี่ยนคำสั่งแพทย์ได้`.
- If no medication info for a requested drug is verifiable, clearly say it cannot provide reliable details rather than inventing them.

Composer at bottom:

- Input placeholder `พิมพ์ข้อความ...`.
- High-contrast send button with accessibility label `ส่งข้อความ`.
- Optional `🔊 ฟังคำตอบ` action on replies using `expo-speech` with Thai text-to-speech when supported by device; allow pause/stop and handle no Thai voice gracefully.
- A microphone icon from mockups should **NOT mislead users into thinking speech recognition works**. In Phase 1 either omit it or make it a clearly disabled future feature with an explanatory label. If trivial, working system speech-to-text can be a stretch goal only after critical flows work.
- Keep composer visible with the Android keyboard and rail intact.

### Chat behavior for MVP

Separate **read-only factual retrieval** from **general medicine knowledge**.

**Read-only schedule questions:** Use the actual current authenticated patient's appointment/medication data. Examples:

- `วันนี้ต้องกินยาอะไรบ้าง` → list only active doctor-assigned medications for the requested day, exact scheduled times, doctor's recorded meal instruction, and completion status if available.
- `ยาเวลา 8 โมงกินหรือยัง` → read the patient's check-in state without fabricating completion.
- `นัดครั้งหน้าเมื่อไหร่` → earliest noncancelled future appointment, date, time, hospital, department.
- `ต้องเตรียมอะไรไปพบหมอ` → return the specific doctor/staff-authored preparation note, or **`แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม`** if absent.
- `เลื่อนนัดให้หน่อย` → explain that only the doctor/staff can modify appointments; do not mutate data.
- `ขอย้ายเวลากินยา` or `หยุดยาได้ไหม` → explain doctor/pharmacist approval is needed; don't suggest an alternative schedule or discontinuation.

**Basic medication information:**

- May explain a drug's **general purpose/common effects/known side effects** only from an explicitly maintained **trusted, reviewed medicine information source** or vetted demo fixture.
- Show source title/link and reviewed/update date where known. No invented citations, no unsupported claims about an individual patient's risk.
- If no verified drug reference is configured, answer: `กรรยังไม่มีข้อมูลยานี้ที่ตรวจสอบได้ กรุณาสอบถามแพทย์หรือเภสัชกร`.
- Never diagnose, determine a new dose, advise skipping doses, override allergy records, or provide personalized medication changes.
- For concerning symptoms, advise contacting clinicians promptly; for emergencies, direct users to local emergency services rather than attempting to treat through chat.
- Do not allow chat prompt injection to reveal another patient's records or write to medication/appointment tables.

**LLM integration:**

- Preferred actual architecture: mobile app → authenticated Supabase Edge Function → enforce session → fetch **only authorized patient's data** → optionally call chosen model provider with a narrow read-only task and guarded prompt → return answer.
- API key must remain only in server environment secrets, never bundled into Expo app or git.
- Avoid passing all personal data/history to an LLM if the question requires only one appointment/time. Use minimum necessary synthetic demo data now.
- If no LLM API configured, implement a **working rule-based chat demo** with intent/keyword handling and deterministic responses grounded in the same repository data. Label it `กรร (โหมดสาธิต)` or similar in demo mode; do not pretend fake output was generated by a real model.
- No medical-knowledge generation from a general LLM alone. Only vetted retrieval/reference content for medication side effects.
- Basic resilience: loading indicator, answer failure state, retry action, and “not in data” response.

**Important:** Don't make chat an isolated mockup. When the doctor edits the patient's appointment or prescribed schedule, the patient's next chat answer **must change accordingly**.

---

## 6. PATIENT SCREEN B — ปฏิทิน HEALTH CALENDAR WITH **NEXT TASK**

This is a critical, user-specific requirement, **more important than a traditional monthly calendar grid**.

### Main visual hierarchy, top to bottom

1. Header: **ปฏิทินสุขภาพ**; subtitle like `ตารางยาและนัดหมายของคุณ`. Optional `วันนี้` shortcut.
2. **VERY PROMINENT TOP CARD:** `สิ่งที่ต้องทำถัดไป`.
3. Narrow date selector or week strip, e.g. `จ อ พ พฤ ศ ส อา`, selected day blue.
4. Today/day's vertical chronological list with big readable cards.
5. Upcoming appointments below, with `ดูทั้งหมด`.
6. Optional week/month view accessible via an obvious control — but do not let a dense month grid displace the next-task panel.

### Next-task card content

- Title: **สิ่งที่ต้องทำถัดไป**.
- Main time e.g. **14:00 น.**.
- Type icon: pill or doctor/clinic.
- Main task label, e.g. `นัดพบแพทย์` or `รับประทานยา`.
- Context e.g. `แผนกอายุรกรรม • โรงพยาบาลตัวอย่าง` or `หลังอาหารเช้า`.
- Short countdown if feasible, e.g. `อีก 4 ชั่วโมง` or `ถึงเวลาแล้ว` (avoid unnecessary live second-by-second updates).
- Primary CTA: for an appointment `ดูรายละเอียด` / `รับทราบนัด`; for a medicine task `รับประทานแล้ว ✓` or `ยืนยันการรับประทาน`.
- A patient must be able to act without opening another page, while still being able to see detailed instructions.

### **Correct next-task algorithm**

Aggregate two types of events from doctor-authored data:

1. Valid upcoming appointments (`scheduled_at`, status not cancelled).
2. Instances of active prescribed medication schedules (`dose occurrences`) based on start/end dates, selected days/frequency, specific local times, and schedule timezone.

For current authenticated patient and current local time in `Asia/Bangkok`:

- Sort occurrences chronologically using real instants, not strings or display labels.
- **Never** assume medication doses have been taken just because their time passed.
- Mark patient-confirmed doses `รับประทานแล้ว` with explicit confirmation timestamp.
- When a task completes, the top card automatically moves to the **next actionable pending task**.
- When an appointment time passes, the upcoming card advances to the next pending item, **but do not label it attended** without an explicit feature/evidence. Keep the past appointment in history with a distinct state.
- For an unconfirmed dose whose scheduled time has passed, mark it **`เลยเวลาที่กำหนด — ยังไม่ได้ยืนยัน`** and keep it visible in a **missed/needs attention list**. The main next-task card may advance to the next future task, but it must NOT silently hide overdue medication. Use a visible alert/count near the top.
- Do not recommend taking a missed dose at a new time. Acknowledge that only the treating clinician/pharmacist can advise about missed-dose handling.
- Make sure “next task” recomputes on focus, after doctor data sync, after confirmation, after app resumes, and periodically enough to roll forward at the correct minute.
- Handle: no tasks today, only future events tomorrow, all tasks complete, overdue tasks, cancelled appointment, edited time, inactive prescription, and timezone/day boundary.
- For a cancelled/revised order, clear or recalculate upcoming local reminder schedules. Historical confirmations remain auditable.

**Example:**

At 09:00, if the 08:00 medicine is confirmed, show next 14:00 doctor appointment. At 14:05 the appointment should no longer present itself as future; show the next active scheduled medication, with any unconfirmed overdue item separately marked. The UI uses whatever schedule the doctor actually entered, not this example permanently.

### Day task list

- Chronological cards e.g. `08:00`, `12:00`, `14:00`, `20:00`.
- Medicine cards show prescribed name, dose, before/after meal instruction, status, and check indicator.
- Appointment cards show hospital, department, address/phone if supplied, and details action.
- For medicine use a big **tap-safe confirmation control** (checkbox + text) that records an actual status entry. Optional confirmation dialog for safety: `ยืนยันว่ารับประทานยานี้แล้วใช่ไหม?`.
- Prevent accidental double submissions. Allow correcting a mistaken check-in with an explicit reversible `แก้ไขการยืนยัน` action if permitted; record corrections cleanly (at least in local demo, and safely in Supabase).
- If the user has not confirmed, keep state **`ยังไม่ได้รับประทาน`** / `ยังไม่ยืนยัน` — never fake a green tick.
- An appointment may be acknowledged with `รับทราบรายละเอียดแล้ว` but **acknowledgment is not attendance/check-in at the hospital**.

### Date views

- Default **Today** list and short week strip.
- Offer week/day navigation; monthly overview can be a simplified stretch goal if time is limited.
- Date/time in easy Thai format; handle Buddhist Era year display consistently when shown (e.g. พ.ศ. 2569) and store dates as proper ISO instants.
- Selecting another date shows that day's events; Next Task card should still clearly refer to **real current next task**, not quietly switch to an unrelated selected-date entry. Label selected-date list and next task separately.

### Medicine detail screen

- Name, amount/dose, unit, exact times, before/after meal instructions, prescribed start/end date, doctor's note, prescribing doctor, state, confirmation log (simple recent history).
- A prominent read-only notice `ตารางยานี้กำหนดโดยแพทย์`.
- Patient may **record** taking a prescribed dose. Patient cannot edit drug name, dosage, time, number of doses, or instructions.

### Appointment detail screen

- Date/time, hospital, department, doctor, location/address, phone, patient preparation instructions, status, appointment version/last updated if useful.
- `รับทราบนัด` registers acknowledgment of the latest version; if doctor edits significant details, prior acknowledgment is invalidated and must be re-confirmed.
- Patients cannot reschedule/cancel from this screen; explain they should contact their clinic.

---

## 7. PATIENT SCREEN C — บัญชี

Keep this screen simpler than the doctor's account:

- Heading `บัญชีของฉัน`.
- Avatar or neutral profile icon, name, optional age (fake data only), and `ผู้ป่วย` role badge.
- `ข้อมูลส่วนตัว` (read-only essential data where appropriate).
- `โรงพยาบาลและข้อมูลติดต่อ` / emergency contact if stored.
- `การแจ้งเตือน` enable/permission details.
- `ขนาดตัวอักษร` setting for accessibility if feasible.
- `ภาษา` → ไทย; English not necessary for Phase 1.
- `ออกจากระบบ`.
- Optional `โหมดสาธิต` marker and `สลับบัญชีสาธิต` in demo-only builds for judges; production must not grant arbitrary account switching.
- **No doctor management options, no “edit medicine instructions” and no hidden user-controlled role switch.**

---

## 8. DOCTOR SIDE — ALL MANAGEMENT ENTERED THROUGH **บัญชี**

The doctor logs into the **same app**. The left rail still has only **กรร**, **ปฏิทิน**, **บัญชี**. Doctor management is reached by tapping **บัญชี** at the bottom of that rail.

### 8.1 Doctor account landing

Header: **บัญชีของฉัน** with doctor name, medical title, hospital/department if known; badge `แพทย์`.

Prominent doctor menu cards/buttons:

1. **จัดการผู้ป่วย** — primary entry point.
2. **จัดการนัดหมาย** — list/calendar of appointments; create/edit/cancel.
3. **จัดการยาและคำสั่งรักษา** — medication schedules/orders; create/edit/discontinue through doctor-side form.
4. **ข้อมูลส่วนตัว**.
5. **การตั้งค่า**.
6. **ออกจากระบบ**.

Doctor pages have a simple back arrow to the account flow. **Do not create a full separate admin app and do not move the management dashboard onto the chatbot or patient calendar tabs.**

### 8.2 Manage patients screen

- Title `จัดการผู้ป่วย`.
- Search bar placeholder `ค้นหาชื่อผู้ป่วย หรือ HN`.
- Show only patients assigned to this doctor/authorized practitioner.
- Scrollable cards with full name, **fake** HN, age if available, small avatar/initial, and action chevron.
- `เพิ่มผู้ป่วยใหม่` only if the prototype has a safe admin-controlled patient-registration flow; otherwise **demo-only** seeded accounts and clear explanation that patient onboarding is future work. Prefer working assigned-patient selection over implementing full clinical signup.
- Empty, loading, and no-search-match states.

### 8.3 Patient summary after doctor taps a patient

- Patient name, HN, contact details, age, optional allergy note **only if actually stored**; don't fabricate missing medical data.
- Sections/tabs: `ภาพรวม`, `นัดหมาย`, `ยา`, `ประวัติ` (simple history; avoid overbuilding).
- Short list of upcoming doctor appointments.
- Short list of active prescribed medications.
- Big actions: **`+ เพิ่มนัดหมาย`** and **`+ เพิ่มรายการยา`**.
- Clear `แก้ไข` / `ยกเลิกนัด` / `หยุดใช้รายการยาตามคำสั่งแพทย์` controls only for doctor, with confirmation for destructive or treatment-affecting changes.

### 8.4 DOCTOR FORM — Create/edit appointment **(manual typing)**

Use real editable inputs and pickers:

- Patient: selected from assigned patients, never arbitrary unverified free-text patient ID.
- `ประเภทนัดหมาย` / appointment reason (e.g. ติดตามอาการ).
- `แพทย์ผู้ดูแล` (pre-filled logged-in doctor; optional free text to display only if applicable).
- `วันที่นัด` with native date picker.
- `เวลานัด` with native time picker; display 24h Thai time.
- Optional estimated duration.
- `ชื่อโรงพยาบาล`.
- `แผนก`.
- `สถานที่ / อาคาร / ชั้น / ห้อง`.
- Optional address and contact phone.
- `คำแนะนำก่อนนัด` multiline (doctor-controlled; can be blank).
- Optional toggle `แจ้งเตือนผู้ป่วย` (enabled by default).
- Save button **`บันทึกนัดหมาย`** / **`บันทึกการเปลี่ยนแปลง`**, loading disabled while submitting.
- Validate required fields, parse dates robustly, reject nonsensical invalid dates with clear errors.
- Doctor can edit or cancel, with confirmation; cancellation should remain visible in history and must stop future notifications.
- Important changes increment `version`, invalidate prior patient acknowledgment, update patient's calendar, and reschedule reminders when client syncs.

### 8.5 DOCTOR FORM — Create/edit prescribed medication schedule **(manual typing)**

Doctor needs an actual medicine entry form, **not just a fake “Add” button**. Fields:

- Patient (locked to currently selected patient).
- `ชื่อยา` — free text entered by doctor; optional generic/reference name if known.
- `ขนาดยา` — e.g. `5` + unit `mg` (avoid confusing medication strength vs number of pills).
- `จำนวนที่รับประทานต่อครั้ง` — e.g. `1` + unit `เม็ด`, optionally ½ where needed; validate positive numeric values.
- `วิธีใช้` free-text instructions from doctor.
- `ช่วงเวลาอาหาร` selection: `ก่อนอาหาร`, `หลังอาหาร`, `พร้อมอาหาร`, `ไม่เกี่ยวกับอาหาร`, or `ตามคำสั่งแพทย์`.
- `เวลาเตือน` — choose one or more exact local times per day, e.g. 08:00 and 20:00; add/delete rows with a straightforward control.
- `ความถี่` — MVP: **every day**, optionally selected weekdays (if building recurrence safely). Avoid complex PRN/as-needed clinical logic until later.
- `วันที่เริ่ม` required; `วันที่สิ้นสุด` optional.
- `เหตุผล/คำแนะนำเพิ่มเติม` optional note **provided by doctor**, not generated by AI.
- `สถานะรายการยา` active/inactive controlled by doctor.
- `เปิดการแจ้งเตือน` default true.
- Action **`บันทึกรายการยา`**.
- Validate medicine name, dosage units, quantity and times, date ordering, duplicate times, malformed entries, etc. Show Thai helpful errors.
- Editing medication instructions should create/increment a version or otherwise preserve traceable history; cancel/reschedule future reminders for obsolete plan versions.
- Doctor can stop/discontinue a plan; **never physically delete history of confirmed doses merely to simplify UI**.
- Don't invent prescribed medicine instructions or generate new dosing instructions from LLM. Doctor owns these fields.
- A doctor may enter data manually without needing OCR or photos in Phase 1.

### 8.6 Future doctor OCR extension — DESIGN FOR IT, DO NOT BUILD IT YET

Reserve a reasonable place on doctor add/edit forms for a future **`สแกนใบสั่งยา / ใบนัด`** action, perhaps disabled with `เร็ว ๆ นี้`; do not show it as working until implemented.

Future pipeline: photo → OCR/AI extraction → **prefill existing manual fields** → **doctor inspects and explicitly confirms** → save. Never allow OCR to publish unverified doses or appointment times. Keep form data model reusable to support this later.

---

## 9. REMINDERS AND NOTIFICATIONS — WORKING AND HONEST

Reminders are part of the core value. Build realistic support without hiding platform limitations.

### Phase 1 prototype requirement

- Request Android notification permission with a simple Thai explanation.
- **Medication reminder** near the exact doctor-entered local time.
- **Appointment reminder** 1 day before appointment (and optionally another preset if safe; one type is sufficient).
- At least a reliable **in-app reminder/task display** whenever the app opens, refreshes, or reaches a due task while active.
- Local scheduled notifications through `expo-notifications` for a practical next-window of patient tasks when the patient device has the schedule; persist scheduling identifiers so old local notifications can be cancelled on a resync/update.
- Notifications should open the relevant patient screen when tapped, respecting authentication and authorization.
- When doctor modifies/cancels an appointment or medication schedule, invalidate old reminders in the app on its next sync; backend-origin push/update can be added to increase reliability.
- Explain and show permission-denied states rather than assuming delivery.

### Supabase/real-device backend option

- `device_tokens` table per authenticated device/account.
- Register/unregister Expo push token when appropriate; unlink tokens on account switch/logout.
- Server Edge Function and scheduled cron job to dispatch push reminders for due tasks, with deduplication keys, current version validation, cancellation status, and basic delivery logs.
- Protect server push secrets. FCM credentials are required for Android remote push through Expo service, and the app needs an appropriate **Expo development build** for remote push testing; **Expo Go on modern Android Expo SDK cannot be used as proof that remote push is working**.
- Use a real Android device and actually test: locked screen, app backgrounded, permission granted/denied, account switch, changed appointment, medication plan updated, and duplicates.
- Notifications do not prove the patient saw them, and tapping `รับประทานแล้ว` is self-report rather than clinically verified ingestion.
- Avoid exposing sensitive drug details on a lockscreen by default. A neutral push body e.g. `ถึงเวลาตรวจสอบรายการสุขภาพของคุณในแอปกรร` is acceptable, with details inside the authenticated app.
- If actual remote push cannot be validated, **explicitly mark it as not yet verified**, keep in-app flow functional, and document how to test it.

---

## 10. DATA AND PERSISTENCE ARCHITECTURE

Create a typed repository/data-access abstraction so the **same UI and business rules** run with two adapters:

- `DemoRepository`: locally stored dummy users, doctors, relationships, appointments, medications, confirmations, and messages. Use `AsyncStorage` (or equivalent) for persistent demo-state edits across navigation/restart if practical. Demo mode is explicitly non-secure and for **fictional data only**.
- `SupabaseRepository`: actual authenticated, RLS-protected reads/writes against PostgreSQL on Supabase; typed responses, loading/error handling, server constraints.

Use a shared, strongly typed domain layer; don't duplicate the UI for the modes. Patient + doctor demo should share one common dataset so a doctor edit immediately affects the patient after switching roles/refreshing (otherwise it's a fake demo).

### Suggested domain types

```ts
type Role = 'patient' | 'doctor';

type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed';

type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  title: string;
  scheduledAt: string;       // ISO 8601 instant
  hospitalName: string;
  department: string;
  locationDetail?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  preparationNote?: string;
  status: AppointmentStatus;
  version: number;
  acknowledgedVersion?: number | null;
  acknowledgedAt?: string | null;
  updatedAt: string;
};

type MedicationPlan = {
  id: string;
  patientId: string;
  doctorId: string;
  medicineName: string;
  strengthValue?: string;
  strengthUnit?: string;
  amountPerDose: string;     // e.g. '1', '0.5'
  amountUnit: string;        // e.g. 'เม็ด'
  mealInstruction: 'before' | 'after' | 'with' | 'none' | 'per_doctor';
  instructions?: string;
  startDate: string;         // local ISO yyyy-MM-dd
  endDate?: string | null;
  timeSlots: string[];       // local HH:mm (24h), e.g. ['08:00','20:00']
  weekdays?: number[] | null; // if supported; document mapping
  timeZone: 'Asia/Bangkok';
  isActive: boolean;
  version: number;
  updatedAt: string;
};

type DoseOccurrence = {
  occurrenceKey: string;    // stable unique occurrence identity + plan version
  medicationPlanId: string;
  medicationPlanVersion: number;
  scheduledAt: string;      // ISO 8601 instant
  status: 'pending' | 'confirmed';
  confirmedAt?: string | null;
};

type Profile = {
  id: string;               // auth UID in Supabase mode
  role: Role;
  displayName: string;
  patientNumber?: string | null;
  hospitalName?: string | null;
  department?: string | null;
};
```

Adjust types when implementing actual schema; use the same meanings across client, database, and rules.

### Minimum Supabase database schema

Use SQL migrations rather than describing tables only:

1. `profiles` — UUID PK referencing `auth.users`, server-owned role, display name, optional fake patient HN/hospital/contact fields.
2. `doctor_patients` — relationship mapping doctor UUID to patients they may manage.
3. `appointments` — appointment fields including patient, doctor, schedule, details, status, version, acknowledged version/time, audit timestamps.
4. `medication_plans` — doctor-authored medication prescription/schedule fields, active status, version, start/end dates, recurrence metadata, patient and doctor ownership.
5. `medication_schedule_times` — one row per configured local time (or a safely typed array with checks, if simpler).
6. `dose_confirmations` — patient self-reported confirmations by **unique occurrence identity** including plan and plan version, scheduled instant, confirmed time and correction metadata if implemented; dedupe against repeated taps.
7. `device_tokens` — Expo push tokens bound to authenticated users/devices for server push.
8. `notification_deliveries` — idempotent delivery log (kind, event ID, version/occurrence, device, status, attempt time).
9. Optional `medicine_reference_info` — **only vetted** general drug descriptions and sources, never AI-invented medical facts.

**Do not design a generic table where a patient can edit doctor orders just because they can update their own row.**

### Supabase authentication + RLS security requirements

- Supabase Auth for both roles; role verified by server-controlled profile/claims or protected assignment, not a dropdown.
- RLS enabled for each patient-specific table.
- Patient can SELECT **only their** appointments/medication plans/confirmations and authorized profile.
- Assigned doctor can SELECT and INSERT/UPDATE only records for patients connected via `doctor_patients`.
- No unauthenticated reads of appointments, prescriptions, HN, medical history, or AI contexts.
- Patient cannot INSERT/UPDATE/DELETE appointment or medication-plan details even by bypassing UI and calling Supabase directly.
- Patient dose confirmation and appointment acknowledgment should be implemented via **narrow, authenticated RPC/Edge Function** or exact column-level permissions where appropriate. They must verify identity, assigned patient, active/current version, and allowed state transitions.
- A patient should not get blanket `UPDATE` on `appointments` to change just `acknowledged_at`; that would risk permitting other fields to change.
- A patient cannot modify their own role to `doctor`.
- Doctors cannot enumerate unrelated patients simply by guessing IDs.
- Never trust a `patient_id` sent from the client without checking authorizations on the server.
- Never put a Supabase `service_role` or other privileged key in `EXPO_PUBLIC_...` or client code. Public URL/anon key only where appropriate and protected by RLS.
- Do not commit real passwords, secrets, identifiable real patient medical data or API keys.
- Prevent cross-account cached data or push-token leakage when switching accounts.
- Keep doctor edit/audit metadata; update versions on meaningful changes.

**Auth seeding:** Real users must be created securely via Supabase Auth admin tooling or documented console steps / server-only seed script. A SQL insert into `profiles` alone does not create functioning Auth credentials. Supply instructions for at least **one doctor and two synthetic patient accounts**, including doctor-patient links. Never ship fixed public doctor credentials for real deployment.

### SQL/queries and time correctness

- Store appointment instants as `timestamptz`, transform to/from `Asia/Bangkok` for UI.
- Recurring medication slots may be stored as local `time` plus IANA timezone `Asia/Bangkok` and local date boundaries; generate occurrences from those fields carefully. Avoid UTC/local date off-by-one errors.
- Distinguish `medication_plan_id`, `version`, and exact `scheduled_at` for an occurrence key; prevent duplicate check-ins and notifications.
- If doctor changes a time, don't let stale notifications or stale confirmations count for a different prescribed occurrence without an explicit rule.
- Synthetic demo clock/time override should be isolated in demo-only development utilities; real-mode schedule must use device/system time and server timestamps where relevant.

---

## 11. DATA FLOW / STATE CHANGES — MUST BE REAL

### A. Doctor appointment creation

```text
Doctor login → บัญชี → จัดการผู้ป่วย → choose patient
→ + เพิ่มนัดหมาย → fill date/time/place/instructions → บันทึก
→ repository persists → patient calendar shows appointment
→ กรร can answer the updated appointment details.
```

### B. Doctor medication schedule creation

```text
Doctor login → บัญชี → จัดการผู้ป่วย → choose patient
→ + เพิ่มรายการยา → enter name, amount, meal context, time(s), dates
→ บันทึก → patient calendar generates due tasks
→ top next-task card reflects earliest relevant upcoming task
→ กรร can answer “วันนี้ต้องกินยาอะไรบ้าง” using those saved instructions.
```

### C. Patient confirms dose

```text
Patient login → ปฏิทิน → medicine task → รับประทานแล้ว
→ optional confirmation dialog → create one self-report event
→ display ✅ รับประทานแล้ว with time → recalculate next task
→ กรร queries same confirmation state and answers consistently.
```

### D. Doctor edits/cancels

```text
Doctor edit/reschedule/discontinue → updated version & status
→ current patient's data refreshes → new information shown
→ old notifications cancelled/replaced when synced
→ patient acknowledgment may be required again
→ กรร does not quote obsolete instructions.
```

### E. Patient asks for unsafe change

```text
Patient: “เลื่อนเวลากินยาให้หน่อย” / “หยุดยาได้ไหม?”
→ กรร explains it cannot modify a doctor's order
→ offers safe direction to contact doctor/pharmacist
→ absolutely no appointment/medication table changes.
```

---

## 12. DUMMY DATA FOR A CONVINCING FIRST DEMO

**Use only clearly fictional, synthetic records.** The doctor name, hospital, phone, HN and medicine fields below are examples, not live clinical advice or real patient data. Keep sample values editable.

Seed at minimum:

- **Doctor account:** `นพ. ธนกร ตัวอย่าง` (role `doctor`).
- **Patient A:** `นางสมใจ ตัวอย่าง` (age about 72, fake HN `DEMO-001`).
- **Patient B:** `นายวิชัย ตัวอย่าง` (age about 68, fake HN `DEMO-002`).
- Link both patients to the doctor; make sure Patient A cannot read Patient B.
- Give Patient A a forthcoming medical appointment with department, hospital, address text and specific doctor-entered preparation instructions.
- Give Patient A 1–2 illustrative prescribed medication schedules (using clearly marked test instructions, not medical recommendations). Prefer easily recognizable generic labels in a demo without implying they are real prescriptions for anyone.
- Provide at least one medicine time before the demo's simulated present time, another upcoming today, and a later appointment; include some confirmed/unconfirmed states so next-task changes can be shown.
- Patient B should have entirely different appointments/medicine so account separation is obvious.
- Prepopulate a short sample กรร conversation or start empty with suggested questions; answers must be dynamically generated from the actual fixture state.
- Appointment cancellation example and a medication plan that can be toggled inactive for testing.

### DEMO TIME TRAVEL TOOL (OPTIONAL BUT HIGH-VALUE)

A **development/demo-only** hidden/obvious labeled testing control may shift a simulated **display clock** between e.g. just before and just after the next task to demonstrate automatic task advancement without waiting hours. Never write fake time into production clinical records and never present this as a real notification delivery guarantee.

### Demo mode account switching

- Offer `เข้าสู่ระบบสาธิต: ผู้ป่วย` / `เข้าสู่ระบบสาธิต: แพทย์` only when demo mode is active.
- Switching between roles must **not wipe the shared fixture dataset**; otherwise doctor edits will disappear.
- Provide a visible `รีเซ็ตข้อมูลสาธิต` action behind a confirmation, not triggered accidentally.

---

## 13. NOT MEDICAL DECISION-MAKING SOFTWARE

This prototype supports **displaying clinician-authored schedules, patient self-reporting, and basic informational Q&A**, not automated clinical decision-making.

Hard constraints:

- No AI-generated prescriptions, dosages, timing changes, medicine avoidance, diagnosis, or appointment rescheduling.
- No implied guarantee that medication reminders prevent errors or that users will never miss a dose.
- No silently assumed “taken” status and no advice to double a missed dose.
- No claims that drug side-effect answers are individualized medical advice; display source and boundaries.
- Where real medical information cannot be verified, reply safely and clearly in Thai.
- The doctor is authoritative for recorded medical orders in Phase 1. In a real product, even doctor's entered data needs identity verification, operational review, governance, and security approval — don't call this production-ready.
- No real patient data in codebase, screenshots, fixtures, telemetry, or LLM prompts during hackathon.
- Use neutral lockscreen notifications to avoid leaking a drug/condition to bystanders.
- App privacy: avoid logging raw medical messages or patient records in production console logs; remove debug logging of secrets.

### Sample Thai assistant guardrail copy

- `กรรช่วยอธิบายข้อมูลจากตารางที่แพทย์บันทึกไว้ แต่ไม่สามารถเปลี่ยนคำสั่งการรักษาได้ครับ`
- `ข้อมูลนี้เป็นข้อมูลทั่วไปเกี่ยวกับยา ไม่ใช่คำแนะนำให้เปลี่ยนวิธีรับประทานยา`
- `กรรไม่พบข้อมูลที่ตรวจสอบได้สำหรับยานี้ กรุณาสอบถามแพทย์หรือเภสัชกรครับ`
- `กรณีลืมรับประทานยา กรุณาติดต่อแพทย์หรือเภสัชกรเพื่อรับคำแนะนำที่เหมาะสม ไม่ควรเพิ่มขนาดยาเองครับ`

---

## 14. RECOMMENDED FILE STRUCTURE

Keep source code clean enough to divide work among teammates. An example:

```text
gan-health-companion/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── login.tsx
│   └── (app)/
│       ├── _layout.tsx
│       ├── assistant.tsx
│       ├── calendar/
│       │   ├── index.tsx
│       │   ├── appointment/[id].tsx
│       │   └── medication/[id].tsx
│       └── account/
│           ├── index.tsx
│           ├── profile.tsx
│           ├── preferences.tsx
│           └── doctor/
│               ├── patients/index.tsx
│               ├── patients/[id].tsx
│               ├── patients/[id]/appointments.tsx
│               ├── patients/[id]/medications.tsx
│               ├── appointments/new.tsx
│               ├── appointments/[id]/edit.tsx
│               ├── medications/new.tsx
│               └── medications/[id]/edit.tsx
├── src/
│   ├── components/
│   │   ├── navigation/SideRail.tsx
│   │   ├── ui/{Button,Card,FormField,EmptyState,StatusBadge}.tsx
│   │   ├── calendar/{NextTaskCard,TaskRow,WeekStrip}.tsx
│   │   ├── chat/{ChatBubble,PromptSuggestions,MessageComposer}.tsx
│   │   └── doctor/{PatientCard,AppointmentForm,MedicationForm}.tsx
│   ├── theme/{colors,spacing,typography}.ts
│   ├── domain/{types,taskOccurrences,nextTask,validation}.ts
│   ├── data/{repository,DemoRepository,SupabaseRepository,demoSeed}.ts
│   ├── providers/{AuthProvider,DataProvider}.tsx
│   ├── services/{assistant,notifications,speech}.ts
│   ├── lib/{supabase,dateTime}.ts
│   └── hooks/{useCurrentUser,useCalendarTasks,useNextTask}.ts
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── assistant/index.ts
│   │   └── send-reminders/index.ts
│   └── seed/README.md
├── tests/
│   ├── nextTask.test.ts
│   ├── medicationOccurrences.test.ts
│   ├── rolePermissions.test.ts
│   └── doctorEditsFlow.test.ts
├── ui-references/
│   ├── 01-gan-chat.png
│   ├── 02-calendar-next-task.png
│   └── 03-doctor-under-account.png
├── .env.example
├── app.json
├── package.json
├── tsconfig.json
├── README.md
├── DEMO_SCRIPT.md
└── AGENTS.md                     # optional short project rules for future Codex runs
```

This is flexible. Avoid blindly creating unused boilerplate; working product and correctness beat matching an ideal tree exactly.

---

## 15. DEPENDENCIES / IMPLEMENTATION CHOICES

Primary:

- Expo + React Native + **TypeScript**.
- **Expo Router** for auth + navigation routes.
- `@supabase/supabase-js` for remote auth/database; session persistence setup appropriate for React Native (`AsyncStorage` or SDK-recommended secure storage pattern); app-role checks and RLS remain on server side.
- `expo-notifications` for local notifications and optional remote push once configured.
- `expo-speech` for Thai text-to-speech, with installed-device voice compatibility checks.
- `@react-native-async-storage/async-storage` for explicitly non-sensitive Demo Mode fixtures / appropriate session storage strategy.
- Lightweight date/time handling such as `date-fns` plus proper timezone handling, or equivalent compatible built-ins; add a focused library only if needed to reliably generate `Asia/Bangkok` occurrences.
- Date/time pickers compatible with current Expo SDK; robust fallback if native build dependencies aren't configured yet.
- Simple icon set (Expo vector icons) and in-app theme tokens.

Avoid:

- Flutter, Spring Boot, Java backend, separate web dashboard, complex cloud microservices.
- Training your own AI model.
- Introducing Firebase Firestore as a second duplicate database just for notifications.
- Complex voice recognition, OCR, payment systems, medical records integrations, physician recommendation algorithms, or unnecessary analytics in Phase 1.
- Installing a large UI framework that obscures the custom left-rail design.
- Any library whose current SDK compatibility is unclear without testing it.

### Environment variables

Provide `.env.example` similar to:

```dotenv
# Default to an intentionally labeled local demonstration if not configured.
EXPO_PUBLIC_USE_DEMO_MODE=true

# Configure only for real Supabase mode. Anon/publishable keys are public client keys,
# but row-level security must protect all health-related data.
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Optional, if appropriate to Expo/EAS configuration
EXPO_PUBLIC_EAS_PROJECT_ID=
```

**AI secrets and server-side Supabase service-role credentials must be configured only in the server/Edge Function secret manager and never here as public variables.** Avoid custom code patterns which assume `.env` is secretly private inside a mobile app.

A `config.ts` should clearly select one repository and display which mode is active. Supabase mode must NOT silently downgrade to demo mode after auth/network failures without informing users.

---

## 16. PHASED IMPLEMENTATION ORDER — BUILD, DON'T ONLY PLAN

Implement in this order to guarantee the first real prototype works even if work stops early.

### P0 — Runnable shell and navigation

- Expo app launches on Android/Expo Go in Demo Mode.
- Portrait lock, Thai design tokens, responsive left rail.
- Login/demo selection with doctor/patient; protected app layout.
- Working navigation between `กรร`, `ปฏิทิน`, `บัญชี`.
- Account page gives doctor-only management menu when doctor is active.
- Proper status/empty/loading/error components.

### P1 — Real interactive local demo: doctor → patient

- Strong typed domain/repository layer and synthetic fixture data.
- Doctor Account → patient list → patient detail → appointment creation/edit/cancel form.
- Doctor Account → patient detail → medication creation/edit/deactivate form.
- Forms validate and save; changes persist to shared demo repository.
- Patient calendar shows results of actual doctor edits.
- Top `สิ่งที่ต้องทำถัดไป` card aggregates appointments and medicine occurrences correctly.
- Patient confirms medication dose; status persists and next-task updates.
- Appointment acknowledgment records a state distinct from actual attendance.
- Rule-based กรร chat answers using live repository records.
- This stage already constitutes a **working first prototype**; prioritize completing it over decorative screens.

### P2 — Supabase persistence + permissions

- SQL migrations, RLS, doctor assignments, safe authenticated CRUD/RPC.
- Supabase Auth client/session and role routing.
- Mapped repository and data refresh across devices.
- Authorized doctor writes and patient reads/confirmations actually work with configured accounts.
- Seed/demo account setup docs.
- Test direct database API attempts to access another user's records or mutate doctor's instructions and confirm they fail.

### P3 — Notifications and speech

- Local Android notifications while supported, permission UX, task targeting.
- Thai read-aloud of appointment instructions and assistant messages.
- Device token registration/remote push function and Cron if configured and testable.
- Document Expo development-build/FCM prerequisites and manual tests.

### P4 — Finish and demo polish

- UI match to reference images; no text clipping, accessible font scaling, small-phone behavior.
- Empty/error/offline states and refreshed data versioning.
- Tests, README, sample accounts/seed instructions, demo flow.
- Stable Android build configuration (EAS if credentials/tooling available).
- Do not claim native push tested unless it was tested on a suitable real/emulated build.

**If tools or credentials are unavailable:** finish P0 + P1 fully, add meaningful Supabase infrastructure and testable instructions for P2, then polish. Do not trade away the working doctor-to-patient loop for an unfinished deep integration.

---

## 17. TESTS / REQUIRED ACCEPTANCE CHECKLIST

Automate pure-logic checks with the team's chosen TypeScript test runner if feasible. Also create a concise `TEST_CHECKLIST.md` with manual steps.

### Functional checks

- [ ] App loads in portrait on narrow Android viewport; no blank screen, missing imports, broken navigation or clipped chat composer.
- [ ] Left rail visibly has only **กรร**, **ปฏิทิน**, **บัญชี**; Account stays pinned to bottom.
- [ ] Thai UI, white-blue theme, LINE-inspired bubble chat, suggested question buttons.
- [ ] Patient Account has no doctor management cards.
- [ ] Doctor Account has patient, appointment, medicine-management actions.
- [ ] Doctor can open the patient list, search, select Patient A, and manually enter a new appointment.
- [ ] A new appointment is stored; switching to Patient A shows it in calendar and กรร answers about it.
- [ ] Doctor can change appointment time or cancel; patient's list and assistant update accordingly; acknowledgment resets for significant edits.
- [ ] Doctor can manually enter a medication name, dose, meal timing, 1–2 daily time slots and start/end dates.
- [ ] Patient sees correct medication occurrences in `ปฏิทิน`.
- [ ] Patient cannot edit doctor-entered medication orders or appointments.
- [ ] Next-task panel shows nearest actionable future event according to current time; sorting works across dates and timezones.
- [ ] Confirming one medication occurrence marks that dose only; other doses remain pending.
- [ ] Next-task panel changes after confirmation/time passes; overdue unconfirmed doses remain clearly visible elsewhere.
- [ ] Reopening the app or reloading does not erase correctly stored confirmations in the selected repository mode.
- [ ] Cancelled appointment/deactivated medication disappears from future active reminders but remains in appropriate history.
- [ ] `วันนี้ต้องกินยาอะไรบ้าง` chat answer lists only patient's current prescribed schedule.
- [ ] `นัดครั้งหน้าเมื่อไร` chat answer uses latest valid appointment.
- [ ] `ยานี้มีผลข้างเคียงอะไร` uses only verified reference info or honestly says no verified information is available.
- [ ] Patient asks chatbot to reschedule or discontinue medicine: chat refuses to mutate clinical orders, directs to clinician.
- [ ] Assistant text can be spoken aloud in Thai where supported, and cannot crash if Thai voice unavailable.
- [ ] All forms show validation; save buttons work and prevent repeated duplicate submissions.
- [ ] Demo data is labeled synthetic, and reset/switching roles behaves predictably.

### Security / privacy checks in Supabase Mode

- [ ] Authenticated Patient A direct API cannot read Patient B's appointments, medications, or confirmations.
- [ ] Patient A cannot change their profile role to doctor.
- [ ] Patient A cannot directly alter appointment date, medication dose, time or active status, even if they bypass UI.
- [ ] Assigned doctor can access their assigned patients only; unrelated doctor cannot query or update them.
- [ ] Patient dose-confirmation RPC checks correct user, current plan version, duplicate occurrence key.
- [ ] Patient acknowledgment cannot be used to update unrelated appointment columns.
- [ ] Privileged keys and LLM secrets are absent from app bundles, `.env.example`, repository and logs.
- [ ] Account switch/logout clears user-specific cached content and push associations.

### Android notifications / lifecycle checks

- [ ] Permission request has Thai description and denied state.
- [ ] If supported, test local reminder after installing development build / suitable Expo runtime.
- [ ] If remote push configured, test physical Android device with FCM, background and locked-screen behavior.
- [ ] No duplicate reminders for same occurrence/version/device; cancel/reschedule strategy present.
- [ ] Clearly record whether push and speech were **actually tested**.

### Build and QA commands

- Run `npm install` (if needed), `npx tsc --noEmit`, `npx expo-doctor` (if available), unit tests, and app startup smoke checks.
- Fix any error introduced by implementation; do not hide failed checks.
- Provide exact commands for `npx expo start` and Android development-build steps where required.
- If there is no Android device in your environment, say you cannot personally validate device behavior.

### Required pure-function test cases

At minimum unit-test:

- Two medication slots on same day with only one confirmed.
- Overdue unconfirmed dose not auto-completed or lost.
- A future appointment chosen after an earlier confirmed dose.
- Appointment cancelled or medication deactivated no longer appears in future upcoming list.
- Day boundary in `Asia/Bangkok`.
- Version change means outdated reminders/confirmations are not conflated with new schedule.
- No tasks returns clear appropriate empty state.
- Search/query filters keep each patient’s data separate in demo repository; RLS tests in Supabase mode.

---

## 18. REQUIRED README AND DEMO PRESENTATION FLOW

Create:

- `README.md`: what app does, stack, environment requirements, repo layout, local run steps, Supabase setup/migrations, authentication/seed instructions, demo mode caveats, remote notification/FCM limits, known limitations.
- `.env.example`: safe client config only.
- `DEMO_SCRIPT.md`: a practical 3–5 minute Thai-friendly demonstration walkthrough with expected results.
- `TEST_CHECKLIST.md`: actual test outcomes and what still needs device/external setup.
- A small `AGENTS.md` for future Codex agent sessions summarizing critical project invariants and core commands (optional but useful).

### Suggested demo script flow

1. Launch app; show clear white/blue theme and accessible **กรร / ปฏิทิน / บัญชี** left rail.
2. Log in as **แพทย์ (สาธิต)**. Tap **บัญชี** → **จัดการผู้ป่วย** → select fictional Patient A.
3. Doctor creates an appointment (e.g., future date at 14:00, department and preparation note); save.
4. Doctor enters a manually typed medicine schedule (e.g., before/after meal instruction, dosage/amount, 09:00 and 20:00 test times); save.
5. Switch into fictional Patient A account (demo-only route; never imply real users can impersonate someone).
6. Show **ปฏิทิน** → **สิ่งที่ต้องทำถัดไป** at top, and chronological list of the doctor's latest appointment/medicine tasks.
7. Tap `รับประทานแล้ว` on one dose; show green status **only for that confirmed dose**, and show next task automatically updating. Show any missed unconfirmed task separately if simulated.
8. Open **กรร**; tap `วันนี้ต้องกินยาอะไรบ้าง?` then `นัดหมอครั้งต่อไปเมื่อไร?`; answers reflect records just entered.
9. Ask กรร to change medication time: demonstrate that **it cannot override the doctor**.
10. Optionally edit the appointment on the doctor side; show patient's new time and re-acknowledgment state.
11. Finish with honest roadmap: **manual doctor input now → future doctor-reviewed image extraction and richer AI assistance**.

---

## 19. DESIGN AND TECHNICAL QUESTIONS RESOLVED IN ADVANCE

To avoid blocking Codex with unnecessary clarifications, use these defaults:

- **App name in Thai:** `กรร` or `กรร | ผู้ช่วยสุขภาพ`.
- **Primary language:** Thai. No English translation needed yet.
- **Primary OS:** Android; code should not needlessly break iOS, but don't spend 20-day effort on iOS release.
- **Navigation:** exact left 3-item rail, with doctor management nested in Account.
- **Auth:** real Supabase email/password for configured prototype; separate, clearly labeled demo entry for fake roles.
- **Data input:** manual doctor forms only in first prototype.
- **Health tasks:** doctor appointment and medication occurrence; patient self-reports medication completion.
- **Calendar:** next task top, today's schedule beneath; week strip; optional month view later.
- **AI:** read-only, narrow chat; deterministic dynamic demo fallback if no server LLM; vetted drug-information knowledge only.
- **Voice:** Thai read-aloud if compatible; microphone/voice input not required initially.
- **Notifications:** in-app and local first; remote push only with configured backend and real tests.
- **Database:** Supabase PostgreSQL with RLS; local synthetic DemoRepository for instant run.
- **No hospital integration:** doctor manually records information in Phase 1.
- **No actual patient health records:** use fictional fixtures only.
- **No medical decision autonomy:** doctor's orders are the source of truth.
- **UI animations:** minimal. Accessibility over motion.
- **Offline behavior:** Demo Mode functional locally; Supabase Mode shows clear offline/error UI and may display locally cached **read-only** latest confirmed data if implemented, marked stale; do not claim unsynced edits were saved.
- **Cross-device synchronization:** expected when Supabase configured; refresh on foreground/screen focus and after mutations. Realtime optional if feasible.
- **Notifications state:** a local notification is not proof of ingestion or receipt.
- **No excessive scope:** omit scanner, comprehensive symptom diagnosis, full voice agent, hospital integrations, live queuing, custom AI model training.

---

## 20. FINAL OUTPUT REQUIRED FROM CODEX

After implementation, don't respond with only a plan. Provide:

1. **What you implemented** with brief descriptions of major screens and core working flows.
2. **How to run it now** (exact local commands, with the correct working directory).
3. **How to demo both roles** (fake account selection in Demo Mode or secure seeded accounts in Supabase Mode).
4. **How to configure Supabase** (migrations, auth user creation/linking, environment variables, edge functions), with clear warnings if any step needs user-side cloud setup.
5. **Test commands and actual results** (typecheck, Expo doctor, tests, Android-device validation if performed).
6. **Any unfinished or simulated pieces**, especially AI provider, remote notifications, photo/OCR, and physical-device validation.
7. **File summary** listing main created/modified files.
8. **Next practical steps for team members**, limited to the most important 3–5 actions.

### FINAL REPEAT OF THE PRODUCT RULE

> **Patient:** I open the app and immediately see the next doctor-approved thing I need to do. I can confirm medicine I actually took and ask กรร what my doctor entered.  
> **Doctor:** I open **บัญชี** and manually manage my patients' appointments and medications.  
> **กรร:** I explain and retrieve authorized data, but I do not change a doctor's instructions.  
> **App:** Thai-first, white and blue, portrait, familiar chat UI, large controls, persistent left sidebar, functional first prototype—not merely screenshots.

**Start implementing now.**

---

## OFFICIAL TECHNICAL REFERENCES FOR THE IMPLEMENTATION AGENT

Read/update against current official documentation where needed; avoid copying obsolete version-specific snippets blindly:

- Expo project creation: https://docs.expo.dev/get-started/create-a-project/
- Expo Router: https://docs.expo.dev/router/introduction/
- Expo TypeScript: https://docs.expo.dev/guides/typescript/
- Expo notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo push setup / FCM: https://docs.expo.dev/push-notifications/push-notifications-setup/
- Expo speech: https://docs.expo.dev/versions/latest/sdk/speech/
- Supabase Expo quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase React Native Auth: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Cron: https://supabase.com/docs/guides/cron

**Notes about the older attached Bomb plan:** `LEGACY_BOMB_PLAN.md` was written on October 7, 2026 and explicitly cut medication schedules from its original MVP. The newer team agreement **adds doctor-entered medication schedules and patient dose confirmations to Phase 1**, so implement this brief when there is a conflict.
