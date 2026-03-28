import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
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

export default function IdentityScreen() {
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
    <View style={[styles.container, { paddingTop: top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Identity</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>Your temporary ID</Text>
          <Text style={styles.idValue}>{tempUserId}</Text>
          <View style={styles.divider} />
          <View style={styles.resetRow}>
            <Feather name="clock" size={14} color={colors.textSecondary} />
            <Text style={styles.resetText}>Resets every 7 days</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
            <Feather name={copied ? "check" : "copy"} size={16} color={copied ? colors.green : colors.textSecondary} />
            <Text style={[styles.copyBtnText, copied && { color: colors.green }]}>
              {copied ? "Copied!" : "Copy ID"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerText}>
          This ID helps us prevent spam while keeping{"\n"}you completely anonymous
        </Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text },
    content: { flex: 1, alignItems: "center", paddingTop: 60, paddingHorizontal: 24, gap: 32 },
    idCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 28, width: "100%", alignItems: "center", gap: 16 },
    idLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    idValue: { fontSize: 36, fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.5 },
    divider: { width: "100%", height: 1, backgroundColor: colors.border },
    resetRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    resetText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, width: "100%", justifyContent: "center" },
    copyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    footerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textTertiary, textAlign: "center", lineHeight: 20 },
  });
}
