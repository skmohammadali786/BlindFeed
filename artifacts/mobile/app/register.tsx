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
import { api } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const canProceed = name.trim().length >= 2 && email.includes("@") && phone.trim().length >= 6;

  const handleRegister = async () => {
    if (!canProceed || loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setLoading(true);
    try {
      const existing = await AsyncStorage.getItem("bf_anonymous_id");
      let anonymousId = existing ?? generateAnonymousId();

      await api.post("/auth/register", { anonymousId, name: name.trim(), email: email.trim(), phone: phone.trim() });
      await setRegistered(anonymousId);

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (onboarded) {
        router.replace("/feed");
      } else {
        router.replace("/onboarding");
      }
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const styles = makeStyles(colors);

  if (step === 0) {
    return (
      <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
        <View style={styles.topSection}>
          <View style={styles.shieldIcon}>
            <Feather name="shield" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>Quick Setup</Text>
          <Text style={styles.subtitle}>
            BlindFeed is completely anonymous — your posts, reactions, and identity are never revealed to anyone.
          </Text>
          <Text style={styles.subtitle}>
            We collect your name, email, and phone number <Text style={styles.highlight}>solely for moderation</Text> — to hold bad actors accountable if harmful content is posted. This information is never shown to any user, ever.
          </Text>
        </View>

        <View style={styles.privacyBox}>
          <View style={styles.privacyRow}>
            <Feather name="eye-off" size={15} color={colors.green} />
            <Text style={styles.privacyText}>Never visible to other users</Text>
          </View>
          <View style={styles.privacyRow}>
            <Feather name="lock" size={15} color={colors.green} />
            <Text style={styles.privacyText}>Stored securely, used only if needed</Text>
          </View>
          <View style={styles.privacyRow}>
            <Feather name="user-x" size={15} color={colors.green} />
            <Text style={styles.privacyText}>Never sold or shared with third parties</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => setStep(1)} activeOpacity={0.85}>
          <Text style={styles.btnText}>I understand, continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => setStep(0)} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.formSubtitle}>
          This information is <Text style={styles.highlight}>private</Text> and only used for content moderation.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your real name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            autoComplete="name"
          />
          <Text style={styles.fieldNote}>Used only to identify you if you post harmful content</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Text style={styles.fieldNote}>For account recovery and moderation contact only</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 234 567 8900"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Text style={styles.fieldNote}>For identity verification if content is reported</Text>
        </View>

        <View style={styles.noteBox}>
          <Feather name="info" size={14} color={colors.textSecondary} />
          <Text style={styles.noteText}>
            Your anonymous identity in the app is completely separate from this information. Other users will never know who you are.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, (!canProceed || loading) && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={!canProceed || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? "Setting up..." : "Join BlindFeed"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
