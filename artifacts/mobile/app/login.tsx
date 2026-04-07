import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { api, storeAuthTokens } from "@/utils/api";
import { AnimatedPressable, FadeSlide, ScreenTransition } from "@/components/Animations";

export default function LoginScreen() {
  const { colors } = useTheme();
  const { setRegistered, setOnboarded } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top + 8;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 24;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canLogin = identifier.trim().length >= 3 && password.length >= 6;

  const handleLogin = async () => {
    if (!canLogin || loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await api.post<{ anonymousId: string; name: string; accessToken?: string | null; refreshToken?: string | null }>("/auth/login", {
        identifier: identifier.trim(),
        password,
      });

      await storeAuthTokens(result);
      await setRegistered(result.anonymousId);
      await setOnboarded();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/feed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <FadeSlide delay={0}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
              <Feather name="arrow-left" size={20} color={colors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </FadeSlide>

          <FadeSlide delay={60}>
            <View style={styles.iconWrap}>
              <Feather name="log-in" size={28} color={colors.green} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Log in with your email or phone number and password.
            </Text>
          </FadeSlide>

          {errorMsg && (
            <FadeSlide delay={0}>
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#fff" />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            </FadeSlide>
          )}

          <FadeSlide delay={120}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email or phone number</Text>
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="you@example.com or +1 234 567 8900"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>
          </FadeSlide>

          <FadeSlide delay={180}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </FadeSlide>

          <FadeSlide delay={240}>
            <AnimatedPressable
              style={[styles.btn, (!canLogin || loading) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={!canLogin || loading}
              scaleTo={0.96}
            >
              <Text style={styles.btnText}>{loading ? "Logging in…" : "Log in"}</Text>
            </AnimatedPressable>
          </FadeSlide>

          <FadeSlide delay={300}>
            <TouchableOpacity style={styles.switchRow} onPress={() => router.replace("/register")}>
              <Text style={styles.switchText}>
                Don't have an account?{" "}
                <Text style={styles.switchLink}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </FadeSlide>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    errorBanner: {
      backgroundColor: "#FF3B30",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
    },
    errorBannerText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 32,
      marginTop: 8,
    },
    backText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.greenDim,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 32,
    },
    fieldGroup: {
      marginBottom: 20,
      gap: 6,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.text,
    },
    passwordRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    eyeBtn: {
      width: 48,
      height: 52,
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    btn: {
      height: 56,
      backgroundColor: colors.green,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 8,
    },
    btnDisabled: {
      opacity: 0.45,
    },
    btnText: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: "#000",
    },
    switchRow: {
      alignItems: "center",
      marginTop: 24,
    },
    switchText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    switchLink: {
      color: colors.green,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
