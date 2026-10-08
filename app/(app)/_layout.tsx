import React, { useEffect, useState } from "react";
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
  const [railOpen, setRailOpen] = useState(true);
  const compact = width <= 360;
  const railWidth =
    width <= 320 ? 52 : width <= 360 ? 60 : width <= 430 ? 82 : 90;
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
        {railOpen && (
          <View
            style={[
              s.rail,
              { width: railWidth, paddingHorizontal: compact ? 2 : 5 },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ซ่อนแถบเมนู"
              testID="rail-toggle-close"
              onPress={() => setRailOpen(false)}
              style={s.railToggle}
            >
              <View style={s.railToggleIcon}>
                <Ionicons name="chevron-back" size={19} color={colors.primaryDark} />
              </View>
            </Pressable>
            {item("assistant", "กรร", "calendar-outline")}
            {item("calendar", "ปฏิทิน", "calendar-outline")}
            <View style={{ flex: 1 }} />
            <View style={s.accountDivider} />
            {item("account", "บัญชี", "person-outline")}
          </View>
        )}
        <View style={s.pane}>
          {(!railOpen || mode === "demo") && (
            <View style={s.topBar}>
              {!railOpen && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="เปิดแถบเมนู"
                  testID="rail-toggle-open"
                  onPress={() => setRailOpen(true)}
                  style={s.openToggle}
                >
                  <View style={s.openIcon}>
                    <Ionicons
                      name="menu-outline"
                      size={22}
                      color={colors.primaryDark}
                    />
                  </View>
                </Pressable>
              )}
              {mode === "demo" && (
                <Txt
                  style={[
                    s.demoLabel,
                    !railOpen && s.demoLabelWithToggle,
                  ]}
                >
                  โหมดสาธิต • ข้อมูลสมมติ
                </Txt>
              )}
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
    gap: 12,
    backgroundColor: "#EDF6FF",
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  railToggle: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  railToggleIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountDivider: {
    height: 1,
    marginHorizontal: 5,
    backgroundColor: colors.border,
  },
  topBar: {
    minHeight: 29,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F0F7FF",
  },
  demoLabel: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  demoLabelWithToggle: {
    marginLeft: 6,
  },
  openToggle: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  openIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
    borderWidth: 1,
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
});
