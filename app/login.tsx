import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { useApp } from "../src/providers/AppProvider";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Field,
  GanAvatar,
  Page,
  Txt,
  colors,
} from "../src/components/ui";

export default function Login() {
  const { user, mode, busy, error, loginDemo, login } = useApp();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [localError, setError] = useState<string | null>(null);
  if (user)
    return (
      <Redirect href={user.role === "doctor" ? "/account" : "/calendar"} />
    );
  async function enter(id?: string) {
    setError(null);
    if (!id && (!email.trim() || !password)) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    try {
      if (id) await loginDemo(id);
      else await login(email.trim(), password);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Page title="กรร" subtitle="ผู้ช่วยสุขภาพของคุณ">
        <View style={s.intro}>
          <GanAvatar size={94} />
          <Txt style={s.welcome}>ทุกวัน อุ่นใจขึ้น</Txt>
          <Txt style={{ textAlign: "center", color: colors.muted }}>
            ตารางยาจากแพทย์ นัดหมายที่ไม่พลาด{"\n"}
            และผู้ช่วยที่พร้อมอธิบายให้คุณ
          </Txt>
        </View>
        <ErrorText text={localError ?? error} />
        {mode === "demo" ? (
          <Card>
            <Badge text="โหมดสาธิต • ข้อมูลสมมติเท่านั้น" />
            <Txt style={{ fontWeight: "700", fontSize: 19 }}>
              ลองใช้งานในบทบาทของคุณ
            </Txt>
            <Txt style={{ color: colors.muted, fontSize: 14 }}>
              บัญชีสาธิตใช้ข้อมูลร่วมกัน การแก้ไขของแพทย์จะปรากฏในบัญชีผู้ป่วย
            </Txt>
            <Button
              label="ผู้ป่วยสาธิต • สมใจ"
              testID="login-patient-a"
              disabled={busy}
              onPress={() => void enter("patient-a")}
            />
            <Button
              label="ผู้ป่วยสาธิต • วิชัย"
              testID="login-patient-b"
              variant="secondary"
              disabled={busy}
              onPress={() => void enter("patient-b")}
            />
            <Button
              label="แพทย์สาธิต • ธนกร"
              testID="login-doctor"
              variant="secondary"
              disabled={busy}
              onPress={() => void enter("doctor-demo")}
            />
          </Card>
        ) : (
          <Card>
            <Badge text="เชื่อมต่อ Supabase" />
            <Field
              label="อีเมล"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label="รหัสผ่าน"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
            <Button
              label="เข้าสู่ระบบ"
              loading={busy}
              onPress={() => void enter()}
            />
            <Txt style={{ fontSize: 14, color: colors.muted }}>
              ใช้บัญชีที่ผู้ดูแลระบบจัดเตรียมไว้
              บทบาทและรายชื่อผู้ป่วยกำหนดโดยระบบ
            </Txt>
          </Card>
        )}
        <Txt style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
          ต้นแบบสำหรับการสาธิต รองรับตารางจากแพทย์และการบันทึกด้วยตนเอง
        </Txt>
      </Page>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  intro: { alignItems: "center", gap: 20, paddingVertical: 26 },
  welcome: { fontSize: 25, fontWeight: "800" },
});
