import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ScreenTransition,
  FadeSlide,
  AnimatedPressable,
  PulseView,
  AnimatedListItem,
} from "@/components/Animations";

function generateAnonymousId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "anon_";
  for (let i = 0; i < 12; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { setRegistered, onboarded } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top + 8;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 24;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const canProceed =
    name.trim().length >= 2 &&
    email.includes("@") &&
    phone.trim().length >= 6 &&
    password.length >= 6;

  const handleRegister = async () => {
    if (!canProceed || loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setLoading(true);
    try {
      const existing = await AsyncStorage.getItem("bf_anonymous_id");
      const anonymousId = existing ?? generateAnonymousId();

      const result = await api.post<{ anonymousId: string; accessToken?: string | null; refreshToken?: string | null }>("/auth/register", {
        anonymousId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      await storeAuthTokens(result);
      await setRegistered(result.anonymousId);

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (onboarded) {
        router.replace("/feed");
      } else {
        router.replace("/onboarding");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please check your info and try again.";
      Alert.alert("Couldn't register", message);
    } finally {
      setLoading(false);
    }
  };

  const styles = makeStyles(colors);

  if (step === 0) {
    return (
      <ScreenTransition>
        <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
          <FadeSlide delay={0} style={styles.topSection}>
            <PulseView>
              <View style={styles.shieldIcon}>
                <Feather name="shield" size={32} color={colors.green} />
              </View>
            </PulseView>
            <Text style={styles.title}>Quick Setup</Text>
            <Text style={styles.subtitle}>
              BlindFeed is completely anonymous — your posts, reactions, and identity are never revealed to anyone.
            </Text>
            <Text style={styles.subtitle}>
              We collect your name, email, and phone number{" "}
              <Text style={styles.highlight}>solely for moderation</Text> — to hold bad actors accountable if
              harmful content is posted. This information is never shown to any user, ever.
            </Text>
          </FadeSlide>

          <FadeSlide delay={120}>
            <View style={styles.privacyBox}>
              {[
                { icon: "eye-off", text: "Never visible to other users" },
                { icon: "lock", text: "Stored securely, used only if needed" },
                { icon: "user-x", text: "Never sold or shared with third parties" },
              ].map((item, i) => (
                <AnimatedListItem key={item.text} index={i}>
                  <View style={styles.privacyRow}>
                    <Feather name={item.icon as any} size={15} color={colors.green} />
                    <Text style={styles.privacyText}>{item.text}</Text>
                  </View>
                </AnimatedListItem>
              ))}
            </View>
          </FadeSlide>

          <FadeSlide delay={280}>
            <AnimatedPressable style={styles.btn} onPress={() => setStep(1)} scaleTo={0.96}>
              <Text style={styles.btnText}>I understand, continue</Text>
            </AnimatedPressable>
          </FadeSlide>

          <FadeSlide delay={340}>
            <TouchableOpacity style={styles.loginRow} onPress={() => router.push("/login")}>
              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={styles.loginLink}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </FadeSlide>
        </View>
      </ScreenTransition>
    );
  }

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
            <TouchableOpacity onPress={() => setStep(0)} style={styles.backRow}>
              <Feather name="arrow-left" size={20} color={colors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </FadeSlide>

          <FadeSlide delay={60}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.formSubtitle}>
              Your personal info is <Text style={styles.highlight}>private</Text> and used only for content moderation.
            </Text>
          </FadeSlide>

          {[
            {
              label: "Full name",
              value: name,
              onChange: setName,
              placeholder: "Your real name",
              note: "Used only to identify you if you post harmful content",
              keyboardType: "default" as const,
              autoCapitalize: "words" as const,
              autoComplete: "name" as const,
              secureTextEntry: false,
            },
            {
              label: "Email address",
              value: email,
              onChange: setEmail,
              placeholder: "you@example.com",
              note: "For account login and moderation contact only",
              keyboardType: "email-address" as const,
              autoCapitalize: "none" as const,
              autoComplete: "email" as const,
              secureTextEntry: false,
            },
            {
              label: "Phone number",
              value: phone,
              onChange: setPhone,
              placeholder: "+1 234 567 8900",
              note: "For identity verification if content is reported",
              keyboardType: "phone-pad" as const,
              autoCapitalize: "none" as const,
              autoComplete: "tel" as const,
              secureTextEntry: false,
            },
          ].map((field, i) => (
            <AnimatedListItem key={field.label} index={i}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.autoCapitalize}
                  autoComplete={field.autoComplete}
                />
                <Text style={styles.fieldNote}>{field.note}</Text>
              </View>
            </AnimatedListItem>
          ))}

          <AnimatedListItem index={3}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldNote}>Used to log back into your account. Never visible to anyone.</Text>
            </View>
          </AnimatedListItem>

          <FadeSlide delay={300}>
            <View style={styles.noteBox}>
              <Feather name="info" size={14} color={colors.textSecondary} />
              <Text style={styles.noteText}>
                Your anonymous identity in the app is completely separate from this information. Other users will
                never know who you are.
              </Text>
            </View>
          </FadeSlide>

          <FadeSlide delay={360}>
            <AnimatedPressable
              style={[styles.btn, (!canProceed || loading) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={!canProceed || loading}
              scaleTo={0.96}
            >
              <Text style={styles.btnText}>{loading ? "Setting up..." : "Join BlindFeed"}</Text>
            </AnimatedPressable>
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
    topSection: {
      paddingHorizontal: 24,
      gap: 16,
      alignItems: "center",
      marginBottom: 32,
    },
    shieldIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.greenDim,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: -0.5,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    highlight: {
      color: colors.green,
      fontFamily: "Inter_600SemiBold",
    },
    privacyBox: {
      marginHorizontal: 24,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 14,
      marginBottom: 32,
    },
    privacyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    privacyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.text,
    },
    btn: {
      marginHorizontal: 24,
      height: 56,
      backgroundColor: colors.green,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    btnDisabled: {
      opacity: 0.45,
    },
    btnText: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: "#000",
    },
    loginRow: {
      alignItems: "center",
      marginTop: 20,
    },
    loginText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    loginLink: {
      color: colors.green,
      fontFamily: "Inter_600SemiBold",
    },
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 24,
      marginTop: 8,
    },
    backText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    formSubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 28,
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
    fieldNote: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    noteBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 24,
      alignItems: "flex-start",
    },
    noteText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 19,
    },
  });
}
