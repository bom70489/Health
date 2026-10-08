import React, { useEffect, useRef, useState } from "react";
import {
  getReminderStatus,
  requestReminders,
  subscribeReminderStatus,
} from "@/src/services/notifications";
import { View } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Page,
  Txt,
  colors,
} from "@/src/components/ui";
import {
  ConfirmDialog,
  doctorStyles,
} from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";
import { thaiDate, bangkokTime } from "@/src/domain/dateTime";

export default function PreferencesScreen() {
  const {
    mode,
    busy,
    fontScale,
    setFontScale,
    loginDemo,
    resetDemo,
    now,
    setDemoClock,
    refresh,
  } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState(getReminderStatus);
  useEffect(() => {
    const unsubscribe = subscribeReminderStatus(() =>
      setReminderStatus(getReminderStatus()),
    );
    return () => {
      unsubscribe();
    };
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const submitting = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (submitting.current) return;
    submitting.current = true;
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "ดำเนินการไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      submitting.current = false;
      setWorking(false);
    }
  };
  const switchAccount = (id: string) =>
    run(async () => {
      await loginDemo(id);
      router.replace(id === "doctor-demo" ? "/account" : "/calendar");
    });
  return (
    <Page title="การตั้งค่า" subtitle="ปรับให้ใช้งานได้สะดวกสำหรับคุณ" back>
      <Card>
        <View style={doctorStyles.stack}>
          <Txt style={doctorStyles.section}>การแจ้งเตือน</Txt>
          <Txt style={doctorStyles.muted}>{reminderStatus}</Txt>
          <Txt style={doctorStyles.body}>
            อนุญาตให้กรรเตือนเมื่อถึงรายการยาและก่อนนัดหมาย
            รายละเอียดการรักษาจะอยู่ภายในแอป
          </Txt>
          <Button
            label="ตรวจสอบ / อนุญาตการแจ้งเตือน"
            loading={working}
            disabled={working || busy}
            onPress={() =>
              run(async () => {
                setMessage(await requestReminders());
                await refresh();
              })
            }
          />
          <Txt style={doctorStyles.muted}>
            หากปิดสิทธิ์ สามารถเปิดอีกครั้งในตั้งค่าของโทรศัพท์
            ตารางและรายการที่ถึงเวลายังแสดงในแอป
          </Txt>
          <Txt style={doctorStyles.muted}>
            การส่งแจ้งเตือนบน Android ต้องทดสอบบนอุปกรณ์จริง
            การแจ้งเตือนไม่ใช่หลักฐานการรับประทานยา
          </Txt>
        </View>
      </Card>
      <Card>
        <View style={doctorStyles.stack}>
          <Txt style={doctorStyles.section}>ขนาดตัวอักษร</Txt>
          <Txt style={doctorStyles.muted}>
            รองรับขนาดตัวอักษรของระบบ และเพิ่มขนาดในแอปได้
          </Txt>
          {[
            { value: 1, label: "ปกติ" },
            { value: 1.15, label: "ใหญ่" },
            { value: 1.3, label: "ใหญ่มาก" },
          ].map((option) => (
            <Button
              key={option.value}
              label={`${fontScale === option.value ? "✓ " : ""}${option.label}`}
              variant={fontScale === option.value ? "primary" : "secondary"}
              onPress={() => setFontScale(option.value)}
            />
          ))}
          <Txt style={doctorStyles.body}>
            ตัวอย่าง: วันนี้มีรายการสุขภาพของคุณ
          </Txt>
          <Txt style={doctorStyles.muted}>ภาษา: ไทย</Txt>
        </View>
      </Card>
      {mode === "demo" ? (
        <>
          <Card style={{ backgroundColor: colors.soft }}>
            <View style={doctorStyles.stack}>
              <Badge text="โหมดสาธิต • ข้อมูลสมมติ" />
              <Txt style={doctorStyles.section}>สลับบัญชีสาธิต</Txt>
              <Txt style={doctorStyles.muted}>
                ข้อมูลที่แพทย์บันทึกและการยืนยันของผู้ป่วยจะยังอยู่เมื่อสลับบัญชี
              </Txt>
              <Button
                label="แพทย์สาธิต"
                disabled={working || busy}
                onPress={() => switchAccount("doctor-demo")}
                testID="switch-doctor"
              />
              <Button
                label="ผู้ป่วยสาธิต A • สมใจ"
                variant="secondary"
                disabled={working || busy}
                onPress={() => switchAccount("patient-a")}
                testID="switch-patient-a"
              />
              <Button
                label="ผู้ป่วยสาธิต B • วิชัย"
                variant="secondary"
                disabled={working || busy}
                onPress={() => switchAccount("patient-b")}
              />
            </View>
          </Card>
          <Card>
            <View style={doctorStyles.stack}>
              <Txt style={doctorStyles.section}>นาฬิกาสำหรับทดสอบสาธิต</Txt>
              <Txt style={doctorStyles.body}>
                {thaiDate(now.toISOString())} • {bangkokTime(now.toISOString())}{" "}
                น.
              </Txt>
              <Txt style={doctorStyles.muted}>
                เปลี่ยนเวลาแสดงรายการในสาธิตเท่านั้น
                การเลื่อนเวลาจะไม่ยืนยันยาให้อัตโนมัติ
              </Txt>
              <Button
                label="เลื่อนไป 30 นาที"
                variant="secondary"
                onPress={() =>
                  setDemoClock(new Date(now.getTime() + 30 * 60_000))
                }
              />
              <Button
                label="เลื่อนไป 1 วัน"
                variant="secondary"
                onPress={() =>
                  setDemoClock(new Date(now.getTime() + 24 * 60 * 60_000))
                }
              />
              <Button
                label="กลับไปใช้เวลาจริง"
                variant="secondary"
                onPress={() => setDemoClock(null)}
              />
            </View>
          </Card>
          <Button
            label="รีเซ็ตข้อมูลสาธิตทั้งหมด"
            variant="danger"
            disabled={working || busy}
            onPress={() => setResetVisible(true)}
          />
          <ConfirmDialog
            visible={resetVisible}
            title="รีเซ็ตข้อมูลสาธิต?"
            message="นัดหมาย ตารางยา การยืนยันและข้อความที่เพิ่มในสาธิตจะถูกแทนที่ด้วยข้อมูลตั้งต้น"
            confirmLabel="ยืนยันรีเซ็ตข้อมูลสาธิต"
            busy={working || busy}
            onCancel={() => setResetVisible(false)}
            onConfirm={() =>
              run(async () => {
                await resetDemo();
                setResetVisible(false);
                setDemoClock(null);
                setMessage("รีเซ็ตข้อมูลสาธิตเรียบร้อยแล้ว");
              })
            }
          />
        </>
      ) : null}
      {message ? (
        <Card>
          <Txt style={doctorStyles.body}>{message}</Txt>
        </Card>
      ) : null}
      <ErrorText text={error} />
    </Page>
  );
}
