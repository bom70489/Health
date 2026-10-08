import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("doctor creates orders; patient sees, confirms, chats, and cannot access doctor routes", async ({
  page,
}) => {
  // A deterministic Bangkok clock makes the next-task transition testable without waiting.
  await page.clock.install({ time: new Date("2026-10-20T10:00:00+07:00") });
  const browserErrors: string[] = [];
  await mkdir("test-results/screenshots", { recursive: true });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await page.getByTestId("login-doctor").click();
  await expect(page.getByTestId("manage-patients")).toBeVisible();
  await expect(page.getByTestId("rail-assistant")).toBeVisible();
  await expect(page.getByTestId("rail-calendar")).toBeVisible();
  await expect(page.getByTestId("rail-account")).toBeVisible();
  await page
    .getByRole("button", {
      name: "การแจ้งเตือนและขนาดตัวอักษร  ›",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "ใหญ่มาก", exact: true }).click();
  await page.getByTestId("rail-account").click();
  await page.getByTestId("manage-patients").click();
  await page.getByTestId("patient-search").fill("DEMO-001");
  await expect(page.getByTestId("patient-patient-a")).toBeVisible();
  await expect(page.getByTestId("patient-patient-b")).toHaveCount(0);
  await page.getByTestId("patient-patient-a").click();
  await page.getByTestId("add-appointment").click();
  await page.getByTestId("save-appointment").click();
  await expect(
    page.getByText("กรุณาระบุประเภทหรือเหตุผลของนัดหมาย", { exact: true }),
  ).toBeVisible();
  await page.getByTestId("appointment-title").fill("นัดทดสอบจากแพทย์ E2E");
  await page
    .getByLabel("วันที่นัด * (ค.ศ. YYYY-MM-DD)", { exact: true })
    .fill("2026-10-20");
  await page
    .getByLabel("เวลานัด * (เวลาไทย) (HH:mm)", { exact: true })
    .fill("14:30");
  await page
    .getByLabel("อาคาร / ชั้น / ห้อง", { exact: true })
    .fill("อาคารทดสอบ ห้อง 201");
  await page
    .getByLabel("คำแนะนำก่อนนัด", { exact: true })
    .fill("นำเอกสารสาธิต E2E มาด้วย");
  await page.getByTestId("appointment-title").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/screenshots/doctor-appointment-large-font.png",
  });
  await page.getByTestId("save-appointment").click();
  await expect(
    page.getByText("บันทึกเรียบร้อยแล้ว", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "กลับไปข้อมูลผู้ป่วย", exact: true })
    .click();
  await expect(
    page
      .getByText("นัดทดสอบจากแพทย์ E2E", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();

  await page.getByTestId("add-medication").filter({ visible: true }).click();
  await page.getByTestId("medicine-name").fill("ยาทดสอบ E2E เท่านั้น");
  await page.getByTestId("dose-amount").fill("1");
  await page.getByLabel("หน่วยจำนวนต่อครั้ง *", { exact: true }).fill("เม็ด");
  await page
    .getByLabel("วิธีใช้ตามคำสั่งแพทย์", { exact: true })
    .fill("คำสั่งสมมติ E2E ห้ามใช้เป็นคำแนะนำจริง");
  await page.getByRole("radio", { name: "หลังอาหาร", exact: true }).click();
  await page.getByLabel("เวลาที่ 1 (HH:mm)", { exact: true }).fill("10:05");
  await page
    .getByRole("button", { name: "+ เพิ่มเวลาเตือน", exact: true })
    .click();
  await page.getByLabel("เวลาที่ 2 (HH:mm)", { exact: true }).fill("10:05");
  await page.getByTestId("save-medication").click();
  await expect(
    page.getByText("เวลาเตือนต้องไม่ซ้ำกัน", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("เวลาที่ 2 (HH:mm)", { exact: true }).fill("20:30");
  await page
    .getByLabel("วันที่เริ่ม * (ค.ศ. YYYY-MM-DD)", { exact: true })
    .fill("2026-10-20");
  await page.getByTestId("medicine-name").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/screenshots/doctor-medication-large-font.png",
  });
  await page.getByTestId("save-medication").click();
  await expect(
    page.getByText("บันทึกเรียบร้อยแล้ว", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "กลับไปข้อมูลผู้ป่วย", exact: true })
    .click();
  await expect(
    page
      .getByText("ยาทดสอบ E2E เท่านั้น", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "ข้อมูลผู้ป่วย", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/screenshots/doctor-patient-summary.png",
  });

  await page.getByTestId("rail-account").click();
  await page
    .getByRole("button", {
      name: "สลับบัญชีสาธิต / รีเซ็ตข้อมูล  ›",
      exact: true,
    })
    .click();
  await page.getByTestId("switch-patient-a").click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(
    page.getByText("ยาทดสอบ E2E เท่านั้น", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("นัดทดสอบจากแพทย์ E2E", { exact: true }).first(),
  ).toBeVisible();
  const nextCard = page
    .getByText("สิ่งที่ต้องทำถัดไป", { exact: true })
    .locator("..")
    .locator("..");
  await expect(nextCard).toContainText("10:05");
  await nextCard
    .getByRole("button", { name: "ยืนยันการรับประทาน", exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยัน", exact: true }).click();
  await expect(nextCard).toContainText("นัดทดสอบจากแพทย์ E2E");
  await expect(nextCard).toContainText("14:30");
  await expect(page.getByText("รับประทานแล้ว", { exact: true })).toBeVisible();
  await expect(page.getByText("20:30 น.", { exact: true })).toBeVisible();
  const eveningDose = page
    .getByText("20:30 น.", { exact: true })
    .locator("..")
    .locator("..");
  await expect(eveningDose).toContainText("ยาทดสอบ E2E เท่านั้น");
  await expect(eveningDose).toContainText("ยังไม่ได้รับประทาน");
  await page
    .getByText("สิ่งที่ต้องทำถัดไป", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/screenshots/patient-calendar-large-font.png",
  });

  await page.getByTestId("rail-assistant").click();
  await page.getByTestId("prompt-0").click();
  await expect(
    page.getByText(/10:05 น. ยาทดสอบ E2E เท่านั้น[\s\S]*รับประทานแล้ว/),
  ).toBeVisible();
  await page.getByTestId("prompt-1").click();
  await expect(
    page.getByText(/14:30[\s\S]*นัดทดสอบจากแพทย์ E2E/),
  ).toBeVisible();
  await page.getByTestId("chat-input").fill("เลื่อนเวลากินยาให้หน่อย");
  await page.getByTestId("chat-send").click();
  await expect(page.getByText(/ไม่สามารถเปลี่ยน[\s\S]*แพทย์/)).toBeVisible();
  await page.screenshot({
    path: "test-results/screenshots/patient-chat-large-font.png",
  });

  await page.getByTestId("rail-account").click();
  await expect(page.getByTestId("manage-patients")).toHaveCount(0);
  await page.goto("/account/doctor/patients");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId("patient-search")).toHaveCount(0);
  await page.getByTestId("rail-calendar").click();
  await page.reload();
  await expect(page.getByText("รับประทานแล้ว", { exact: true })).toBeVisible();
  await expect(
    page.getByText("นัดทดสอบจากแพทย์ E2E", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("ยาทดสอบ E2E เท่านั้น", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByTestId("rail-account")).toBeInViewport();
  await page.getByTestId("rail-account").click();
  await page
    .getByRole("button", {
      name: "สลับบัญชีสาธิต / รีเซ็ตข้อมูล  ›",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "ผู้ป่วยสาธิต B • วิชัย", exact: true })
    .click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(
    page.getByText("ยาตัวอย่าง B (สาธิต)", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("ยาทดสอบ E2E เท่านั้น", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("นัดทดสอบจากแพทย์ E2E", { exact: true }),
  ).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});
