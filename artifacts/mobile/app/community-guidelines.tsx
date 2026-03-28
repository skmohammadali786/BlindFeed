import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

const RULES = [
  { icon: "heart", text: "No abuse or harassment" },
  { icon: "alert-circle", text: "No spam or repetitive content" },
  { icon: "alert-triangle", text: "No harmful or dangerous content" },
  { icon: "eye-off", text: "Respect privacy and boundaries" },
];

export default function CommunityGuidelinesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Guidelines</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <Feather name="shield" size={36} color={colors.green} />
          </View>
        </View>

        <Text style={styles.intro}>
          BlindFeed is anonymous, but that doesn't mean anything goes. We believe in honest, respectful conversations.
        </Text>

        <Text style={styles.sectionTitle}>The rules</Text>

        <View style={styles.rulesCard}>
          {RULES.map((rule, idx) => (
            <View key={idx} style={[styles.ruleRow, idx < RULES.length - 1 && styles.ruleRowBorder]}>
              <View style={styles.ruleIcon}>
                <Feather name={rule.icon as never} size={16} color={colors.green} />
              </View>
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Enforcement</Text>
        <Text style={styles.body}>
          Violations may result in content removal. Repeat offenders may be temporarily or permanently banned. We don't reveal identities, but we do track anonymous IDs for moderation.
        </Text>

        <Text style={styles.sectionTitle}>Reporting</Text>
        <Text style={styles.body}>
          See something that doesn't belong? Use the report button on any post. Our team reviews all reports within 24 hours.
        </Text>

        <TouchableOpacity style={styles.reportBtn} onPress={() => router.push("/report")} activeOpacity={0.85}>
          <Feather name="flag" size={16} color={colors.green} />
          <Text style={styles.reportBtnText}>Report content</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text },
    content: { paddingHorizontal: 20, gap: 20 },
    iconContainer: { alignItems: "center", paddingTop: 16, paddingBottom: 8 },
    iconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.greenDim, justifyContent: "center", alignItems: "center" },
    intro: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: 24, textAlign: "center" },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text, marginTop: 4 },
    rulesCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden" },
    ruleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
    ruleRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    ruleIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.greenDim, justifyContent: "center", alignItems: "center" },
    ruleText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text },
    body: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: 22 },
    reportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.greenDim, borderRadius: 14, paddingVertical: 16, marginTop: 4 },
    reportBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.green },
  });
}
