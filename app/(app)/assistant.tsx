import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../src/providers/AppProvider";
import {
  Badge,
  Button,
  ErrorText,
  GanAvatar,
  Txt,
  colors,
} from "../../src/components/ui";
import { answerQuestion } from "../../src/services/assistantLogic";
import { readAloud, stopSpeech } from "../../src/services/speech";
import { supabase } from "../../src/lib/supabase";
import { bangkokTime } from "../../src/domain/dateTime";
import { ChatMessage } from "../../src/domain/types";

const prompts = [
  "วันนี้ต้องกินยาอะไรบ้าง?",
  "นัดหมอครั้งต่อไปเมื่อไร?",
  "ยานี้มีผลข้างเคียงอะไร?",
];
const messageId = (role: string) =>
  `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export default function Assistant() {
  const { user, data, now, mode, mutate, refresh, fontScale } = useApp(),
    [input, setInput] = useState(""),
    [sending, setSending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [retry, setRetry] = useState<string | null>(null),
    scroll = useRef<ScrollView>(null),
    sendLock = useRef(false);
  const messages = data.messages.filter((m) => m.patientId === user?.id);
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [messages.length, sending]);
  useEffect(
    () => () => {
      void stopSpeech();
    },
    [],
  );
  async function send(question: string, retrying = false) {
    if (
      !question.trim() ||
      sendLock.current ||
      !user ||
      user.role !== "patient"
    )
      return;
    sendLock.current = true;
    setSending(true);
    setError(null);
    setRetry(null);
    setInput("");
    const q = question.trim();
    try {
      const stamp = new Date().toISOString();
      const message: ChatMessage = {
        id: messageId("user"),
        patientId: user.id,
        role: "user",
        text: q,
        createdAt: stamp,
      };
      if (!retrying) await mutate((r) => r.addMessage(message));
      if (mode === "supabase") {
        const result = await supabase!.functions.invoke("assistant", {
          body: { question: q },
        });
        if (result.error || result.data?.error)
          throw new Error("กรรตอบไม่สำเร็จ กรุณาลองใหม่");
        await refresh();
      } else {
        const text = answerQuestion(q, data, user.id, now);
        await mutate((r) =>
          r.addMessage({
            id: messageId("assistant"),
            patientId: user.id,
            role: "assistant",
            text,
            createdAt: new Date().toISOString(),
          }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "ส่งข้อความไม่สำเร็จ");
      setRetry(q);
    } finally {
      setSending(false);
      sendLock.current = false;
    }
  }
  if (user?.role === "doctor")
    return (
      <View style={{ padding: 20, gap: 14 }}>
        <GanAvatar size={56} />
        <Txt style={{ fontSize: 25, fontWeight: "800" }}>กรร</Txt>
        <Txt>
          ผู้ช่วยอ่านตารางสำหรับผู้ป่วย
          คุณสามารถจัดการตารางผู้ป่วยผ่านบัญชีแพทย์
        </Txt>
        <Badge text="ผู้ช่วยไม่สามารถเปลี่ยนคำสั่งแพทย์" />
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.header}>
        <GanAvatar size={45} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontSize: 26, fontWeight: "800" }}>กรร</Txt>
          <Txt style={{ fontSize: 13, color: colors.muted }}>
            ผู้ช่วยสุขภาพของคุณ
          </Txt>
        </View>
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 8, gap: 6 }}>
        <Badge text="อ้างอิงข้อมูลจากแพทย์" />
        <Txt style={{ fontSize: 11, color: colors.muted }}>
          ตอบด้วยระบบอ่านตาราง • ไม่เปลี่ยนคำสั่งแพทย์
        </Txt>
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.conversation}
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: true })
        }
      >
        <View style={s.assistantRow}>
          <GanAvatar size={28} />
          <View style={s.bubbleAssistant}>
            <Txt>
              สวัสดีครับ ผมกรร ช่วยอ่านตารางที่แพทย์บันทึกไว้ให้คุณ
              วันนี้มีอะไรให้ช่วยไหมครับ?
            </Txt>
          </View>
        </View>
        <View style={s.suggestions}>
          <Txt style={{ fontWeight: "700" }}>ลองถามกรรดู</Txt>
          {prompts.map((p, i) => (
            <Pressable
              accessibilityRole="button"
              key={p}
              disabled={sending}
              testID={`prompt-${i}`}
              onPress={() => void send(p)}
              style={s.prompt}
            >
              <Ionicons
                name={
                  i === 0
                    ? "medical-outline"
                    : i === 1
                      ? "calendar-outline"
                      : "help-circle-outline"
                }
                color={colors.primary}
                size={22}
              />
              <Txt style={{ flex: 1, fontSize: 15 }}>{p}</Txt>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
        {messages.map((m) => (
          <View
            key={m.id}
            style={m.role === "user" ? s.userRow : s.assistantRow}
          >
            {m.role === "assistant" && <GanAvatar size={28} />}
            <View
              style={{
                flexShrink: 1,
                maxWidth: m.role === "user" ? "90%" : "88%",
                gap: 4,
              }}
            >
              <View
                style={m.role === "user" ? s.bubbleUser : s.bubbleAssistant}
              >
                <Txt selectable>{m.text}</Txt>
                {m.role === "assistant" && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="ฟังคำตอบ"
                    onPress={() => void readAloud(m.text).then(setError)}
                    style={{
                      minHeight: 44,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name="volume-medium-outline"
                      color={colors.primary}
                      size={21}
                    />
                    <Txt style={{ fontSize: 13, color: colors.primaryDark }}>
                      ฟังคำตอบ
                    </Txt>
                  </Pressable>
                )}
              </View>
              <Txt
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  textAlign: m.role === "user" ? "right" : "left",
                }}
              >
                {bangkokTime(m.createdAt)}
              </Txt>
            </View>
          </View>
        ))}
        {sending && (
          <View style={s.assistantRow}>
            <ActivityIndicator color={colors.primary} />
            <Txt style={{ fontSize: 14 }}>กรรกำลังอ่านตาราง...</Txt>
          </View>
        )}
        <ErrorText text={error} />
        {retry && (
          <Button
            label="ลองส่งอีกครั้ง"
            variant="secondary"
            onPress={() => void send(retry, true)}
          />
        )}
      </ScrollView>
      <View style={s.composer}>
        <TextInput
          accessibilityLabel="พิมพ์ข้อความ"
          placeholder="พิมพ์ข้อความ..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          style={[s.input, { fontSize: 16 * fontScale }]}
          testID="chat-input"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ส่งข้อความ"
          testID="chat-send"
          disabled={sending || !input.trim()}
          onPress={() => void send(input)}
          style={[s.send, (sending || !input.trim()) && { opacity: 0.5 }]}
        >
          <Ionicons name="send" color="white" size={23} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void stopSpeech()}
        style={{ padding: 5, alignItems: "center", minHeight: 30 }}
      >
        <Txt style={{ fontSize: 11, color: colors.primaryDark }}>หยุดเสียง</Txt>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", gap: 12, padding: 16, alignItems: "center" },
  conversation: { padding: 12, gap: 16, paddingBottom: 20 },
  assistantRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  userRow: { flexDirection: "row", justifyContent: "flex-end" },
  bubbleAssistant: {
    backgroundColor: "white",
    padding: 13,
    borderRadius: 19,
    borderTopLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 1,
  },
  bubbleUser: {
    backgroundColor: "#D8ECFF",
    padding: 13,
    borderRadius: 19,
    borderBottomRightRadius: 5,
  },
  suggestions: {
    backgroundColor: colors.soft,
    borderRadius: 19,
    padding: 12,
    gap: 8,
  },
  prompt: {
    backgroundColor: "white",
    minHeight: 54,
    borderRadius: 13,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  composer: {
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 130,
    backgroundColor: colors.canvas,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
});
