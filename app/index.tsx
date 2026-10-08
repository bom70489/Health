import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useApp } from "../src/providers/AppProvider";
export default function Index() {
  const { user, loading } = useApp();
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#2878D0" />
      </View>
    );
  return (
    <Redirect
      href={
        user ? (user.role === "doctor" ? "/account" : "/calendar") : "/login"
      }
    />
  );
}
