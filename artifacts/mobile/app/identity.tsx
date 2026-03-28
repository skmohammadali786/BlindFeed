import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { usePreventScreenCapture } from "expo-screen-capture";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { ScreenTransition, FadeSlide, PulseView, GlowPulse, AnimatedPressable } from "@/components/Animations";

export default function IdentityScreen() {
  usePreventScreenCapture();
  const { colors } = useTheme();
  const { tempUserId } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(tempUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your Identity</Text>
            <View style={{ width: 38 }} />
          </View>
        </FadeSlide>

        <View style={styles.content}>
          <FadeSlide delay={80}>
            <GlowPulse>
              <View style={styles.idCard}>
                <PulseView speed={2400}>
                  <View style={styles.iconRing}>
                    <Feather name="user-check" size={28} color={colors.green} />
                  </View>
                </PulseView>
                <Text style={styles.idLabel}>Your anonymous ID</Text>
                <Text style={styles.idValue}>{tempUserId}</Text>
                <View style={styles.divider} />
                <View style={styles.resetRow}>
                  <Feather name="clock" size={14} color={colors.textSecondary} />
                  <Text style={styles.resetText}>Auto-resets every 7 days</Text>
                </View>
                <View style={styles.resetRow}>
                  <Feather name="search" size={14} color={colors.textSecondary} />
                  <Text style={styles.resetText}>Others can search this ID to find your posts</Text>
                </View>
                <AnimatedPressable
                  style={styles.copyBtn}
                  onPress={handleCopy}
                  scaleTo={0.95}
                >
                  <Feather
                    name={copied ? "check" : "copy"}
                    size={16}
                    color={copied ? colors.green : colors.textSecondary}
                  />
                  <Text style={[styles.copyBtnText, copied && { color: colors.green }]}>
                    {copied ? "Copied!" : "Copy ID"}
                  </Text>
                </AnimatedPressable>
              </View>
            </GlowPulse>
          </FadeSlide>

          <FadeSlide delay={200}>
            <Text style={styles.footerText}>
              This ID helps us prevent spam while keeping{"\n"}you completely anonymous
            </Text>
          </FadeSlide>
        </View>
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    content: { flex: 1, alignItems: "center", paddingTop: 48, paddingHorizontal: 24, gap: 28 },
    idCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 28,
      width: "100%",
      alignItems: "center",
      gap: 16,
      borderWidth: 1,
      borderColor: colors.greenDim,
    },
    iconRing: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.greenDim,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    idLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    idValue: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: 1,
      textAlign: "center",
    },
    divider: { width: "100%", height: 1, backgroundColor: colors.border },
    resetRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    resetText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 14,
      width: "100%",
      justifyContent: "center",
    },
    copyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    footerText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 20,
    },
  });
}
