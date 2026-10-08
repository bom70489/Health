import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../providers/AppProvider";

export const colors = {
  primary: "#2878D0",
  primaryDark: "#135BA8",
  soft: "#EAF4FF",
  canvas: "#F7FBFF",
  surface: "#FFFFFF",
  text: "#17314D",
  muted: "#5C738B",
  border: "#D9E7F5",
  green: "#19724D",
  greenSoft: "#E5F7ED",
  amber: "#8C5311",
  amberSoft: "#FFF2DF",
  red: "#B33545",
  redSoft: "#FFF0F2",
};
export function Txt(props: TextProps) {
  const { fontScale } = useApp();
  const flat = StyleSheet.flatten(props.style);
  return (
    <Text
      {...props}
      style={[
        styles.text,
        props.style,
        {
          fontSize: (flat?.fontSize ?? 16) * fontScale,
          lineHeight:
            (flat?.lineHeight ?? Math.max(25, (flat?.fontSize ?? 16) * 1.45)) *
            fontScale,
        },
      ]}
    />
  );
}
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary"
          ? styles.secondary
          : variant === "danger"
            ? styles.danger
            : styles.primary,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading && (
        <ActivityIndicator
          color={variant === "secondary" ? colors.primary : "white"}
        />
      )}
      <Txt
        style={{
          flexShrink: 1,
          color: variant === "secondary" ? colors.primaryDark : "white",
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.card, width <= 360 && styles.cardCompact, style]}>
      {children}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { fontScale } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <Txt style={{ fontWeight: "600" }}>{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          styles.input,
          { fontSize: 16 * fontScale },
          props.multiline && { minHeight: 90, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Page({
  title,
  subtitle,
  children,
  back = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  back?: boolean;
}) {
  const { width } = useWindowDimensions();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.page,
          {
            paddingHorizontal:
              width <= 320 ? 10 : width <= 360 ? 12 : width <= 430 ? 14 : 16,
            gap: width <= 360 ? 11 : 14,
          },
        ]}
      >
        {back && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/account")
            }
            style={styles.back}
          >
            <Ionicons name="chevron-back" color={colors.primary} size={22} />
            <Txt style={{ color: colors.primaryDark }}>กลับ</Txt>
          </Pressable>
        )}
        <View style={{ gap: 5, marginBottom: 8 }}>
          <Txt accessibilityRole="header" style={styles.title}>
            {title}
          </Txt>
          {subtitle && <Txt style={styles.muted}>{subtitle}</Txt>}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Badge({
  text,
  tone = "blue",
}: {
  text: string;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const palette = {
    blue: [colors.soft, colors.primaryDark],
    green: [colors.greenSoft, colors.green],
    amber: [colors.amberSoft, colors.amber],
    red: [colors.redSoft, colors.red],
  }[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 9,
        paddingHorizontal: 9,
        paddingVertical: 5,
        backgroundColor: palette[0],
      }}
    >
      <Txt style={{ fontSize: 12, color: palette[1], fontWeight: "700" }}>
        {text}
      </Txt>
    </View>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <Card style={{ alignItems: "center", gap: 12, paddingVertical: 28 }}>
      <Ionicons name="leaf-outline" color={colors.primary} size={32} />
      <Txt style={{ color: colors.muted, textAlign: "center" }}>{text}</Txt>
    </Card>
  );
}
export function ErrorText({ text }: { text: string | null }) {
  return text ? (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: colors.redSoft, padding: 12, borderRadius: 12 }}
    >
      <Txt style={{ color: colors.red }}>{text}</Txt>
    </View>
  ) : null;
}
export function GanAvatar({ size = 48 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="กรร ผู้ช่วยสุขภาพ"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.38,
        backgroundColor: "#C6E5FF",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#A4D2FC",
      }}
    >
      <View
        style={{
          width: size * 0.72,
          height: size * 0.57,
          borderRadius: size * 0.2,
          backgroundColor: "white",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ flexDirection: "row", gap: size * 0.23 }}>
          <View
            style={{
              width: size * 0.08,
              height: size * 0.12,
              borderRadius: 5,
              backgroundColor: colors.text,
            }}
          />
          <View
            style={{
              width: size * 0.08,
              height: size * 0.12,
              borderRadius: 5,
              backgroundColor: colors.text,
            }}
          />
        </View>
        <View
          style={{
            width: size * 0.16,
            height: size * 0.06,
            borderBottomWidth: 2,
            borderColor: colors.primaryDark,
            borderRadius: 8,
            marginTop: size * 0.07,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          top: -size * 0.09,
          width: size * 0.12,
          height: size * 0.14,
          backgroundColor: colors.primary,
          borderRadius: 8,
        }}
      />
    </View>
  );
}
export const styles = StyleSheet.create({
  text: { fontSize: 16, color: colors.text, lineHeight: 25 },
  muted: { fontSize: 14, color: colors.muted },
  title: {
    fontSize: 25,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.text,
  },
  page: { gap: 14, paddingTop: 16, paddingBottom: 36 },
  card: {
    backgroundColor: "white",
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
  },
  cardCompact: { padding: 12, gap: 8 },
  button: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.red },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#B5CDE5",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
  },
  back: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: 3,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  section: { fontSize: 19, fontWeight: "700", lineHeight: 28 },
});
