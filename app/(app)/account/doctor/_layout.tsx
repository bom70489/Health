import React from "react";
import { Redirect, Stack } from "expo-router";
import { useApp } from "@/src/providers/AppProvider";
import { Page, Txt, colors } from "@/src/components/ui";

export default function DoctorLayout() {
  const { user, loading } = useApp();
  if (loading)
    return (
      <Page title="กำลังตรวจสอบสิทธิ์">
        <Txt>กรุณารอสักครู่</Txt>
      </Page>
    );
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "doctor") return <Redirect href="/account" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    />
  );
}
