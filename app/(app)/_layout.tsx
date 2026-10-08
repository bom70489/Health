import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, Slot, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../src/providers/AppProvider";
import { GanAvatar, Txt, colors } from "../../src/components/ui";
import { canUseNotificationModule } from "../../src/services/notifications";

export default function AppLayout() {
  const { user, loading, mode, refresh, error } = useApp(),
    path = usePathname();
  const { width } = useWindowDimensions();
  const compact = width <= 360;
  const railWidth =
    width <= 320 ? 52 : width <= 360 ? 58 : width <= 430 ? 64 : 70;
  useEffect(() => {
    void refresh();
  }, [path, refresh]);
  useEffect(() => {
    if (!canUseNotificationModule() || !user) return;
    let closed = false;
    let cleanup: (() => void) | undefined;
    void import("expo-notifications")
      .then((n) => {
        if (closed) return;
        const navigate = (response: any) => {
          const d = response.notification.request.content.data;
          const url = d.url;
          if (
            d.userId === user.id &&
            typeof url === "string" &&
            /^\/calendar\/(appointment|medication)\/[A-Za-z0-9-]+$/.test(url)
          )
            router.push(url as any);
        };
        const last = n.getLastNotificationResponse();
        if (last) navigate(last);
        const sub = n.addNotificationResponseReceivedListener(navigate);
        cleanup = () => sub.remove();
      })
      .catch(() => {});
    return () => {
      closed = true;
      cleanup?.();
    };
  }, [user]);
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  if (!user) return <Redirect href="/login" />;
  const active = path.startsWith("/account")
    ? "account"
    : path.startsWith("/assistant")
      ? "assistant"
      : "calendar";
  const item = (
    id: "assistant" | "calendar" | "account",
    label: string,
    icon: "calendar-outline" | "person-outline",
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active === id }}
      testID={`rail-${id}`}
      onPress={() => router.replace(`/${id}` as any)}
      style={[s.item, compact && s.itemCompact, active === id && s.active]}
    >
      {id === "assistant" ? (
        <GanAvatar size={compact ? 30 : 35} />
      ) : (
        <Ionicons
          name={icon}
          size={27}
          color={active === id ? "white" : colors.text}
        />
      )}
      <Txt
        style={{
          fontSize: compact ? 10 : 12,
          color: active === id ? "white" : colors.text,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {label}
      </Txt>
    </Pressable>
  );
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.shell}>
        <View
          style={[
            s.rail,
            { width: railWidth, paddingHorizontal: compact ? 2 : 5 },
          ]}
        >
          {item("assistant", "กรร", "calendar-outline")}
          {item("calendar", "ปฏิทิน", "calendar-outline")}
          <View style={{ flex: 1 }} />
          {item("account", "บัญชี", "person-outline")}
        </View>
        <View style={s.pane}>
          {mode === "demo" && (
            <View style={s.demo}>
              <Txt
                style={{
                  fontSize: 11,
                  color: colors.primaryDark,
                  fontWeight: "600",
                }}
              >
                โหมดสาธิต • ข้อมูลสมมติ
              </Txt>
            </View>
          )}
          {error && (
            <Pressable
              onPress={() => void refresh()}
              style={{ backgroundColor: colors.redSoft, padding: 10 }}
            >
              <Txt style={{ fontSize: 13, color: colors.red }}>
                โหลดข้อมูลไม่สำเร็จ • แตะเพื่อลองใหม่
              </Txt>
            </Pressable>
          )}
          <Slot />
        </View>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  shell: {
    flex: 1,
    flexDirection: "row",
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
  },
  rail: {
    paddingTop: 22,
    paddingBottom: 12,
    gap: 14,
    backgroundColor: "#E8F3FE",
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  item: {
    minHeight: 76,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  itemCompact: { minHeight: 68, paddingVertical: 7, gap: 5 },
  active: { backgroundColor: colors.primary },
  pane: { flex: 1, minWidth: 0 },
  demo: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F0F7FF",
  },
});
