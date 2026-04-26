import { Stack, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0C081C" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🌅</Text>
          <Text
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            Page Not Found
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              textAlign: "center",
              lineHeight: 21,
              marginBottom: 28,
            }}
          >
            The page you're looking for doesn't exist.
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
            style={{
              backgroundColor: "#FF6B35",
              borderRadius: 14,
              paddingHorizontal: 28,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              Go Home
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
