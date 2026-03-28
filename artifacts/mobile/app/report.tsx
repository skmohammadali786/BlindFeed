import { Feather } from "@expo/vector-icons";
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
import { ScreenTransition, FadeSlide, AnimatedListItem, AnimatedPressable } from "@/components/Animations";

const REASONS = [
  { id: "spam", label: "Spam", icon: "alert-circle" },
  { id: "abuse", label: "Abuse or harassment", icon: "alert-triangle" },
  { id: "sensitive", label: "Sensitive content", icon: "eye-off" },
  { id: "other", label: "Other", icon: "more-horizontal" },
];

export default function ReportScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => { if (!selected) return; setSubmitted(true); };

  const styles = makeStyles(colors);

  if (submitted) {
    return (
      <ScreenTransition>
        <View style={[styles.container, { paddingTop: top }]}>
          <TouchableOpacity style={[styles.backBtn, { margin: 16 }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <FadeSlide delay={0} style={styles.successContent as any}>
            <View style={styles.successIcon}>
              <Feather name="check" size={30} color={colors.green} />
            </View>
            <Text style={styles.successTitle}>Report submitted</Text>
            <Text style={styles.successSub}>
              Thank you for helping keep BlindFeed safe.{"\n"}We'll review this content shortly.
            </Text>
            <AnimatedPressable style={styles.doneBtn} onPress={() => router.back()} scaleTo={0.96}>
              <Text style={styles.doneBtnText}>Done</Text>
            </AnimatedPressable>
          </FadeSlide>
        </View>
      </ScreenTransition>
    );
  }

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report Content</Text>
            <View style={{ width: 38 }} />
          </View>
        </FadeSlide>

        <View style={[styles.content, { paddingBottom: bottom + 24 }]}>
          <FadeSlide delay={60}>
            <Text style={styles.question}>Why are you reporting this content?</Text>
          </FadeSlide>
          <View style={styles.reasons}>
            {REASONS.map((reason, idx) => (
              <AnimatedListItem key={reason.id} index={idx}>
                <TouchableOpacity
                  style={[styles.reasonRow, selected === reason.id && styles.reasonRowSelected, idx < REASONS.length - 1 && styles.reasonRowBorder]}
                  onPress={() => setSelected(reason.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reasonLeft}>
                    <Feather name={reason.icon as never} size={18} color={selected === reason.id ? colors.green : colors.textSecondary} />
                    <Text style={[styles.reasonLabel, selected === reason.id && { color: colors.green, fontFamily: "Inter_500Medium" }]}>
                      {reason.label}
                    </Text>
                  </View>
                  {selected === reason.id && <Feather name="check" size={18} color={colors.green} />}
                </TouchableOpacity>
              </AnimatedListItem>
            ))}
          </View>

          <FadeSlide delay={280}>
            <AnimatedPressable
              style={[styles.submitBtn, !selected && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!selected}
              scaleTo={0.96}
            >
              <Text style={[styles.submitBtnText, !selected && { color: colors.textTertiary }]}>Submit Report</Text>
            </AnimatedPressable>
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
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text },
    content: { flex: 1, padding: 20, gap: 20 },
    question: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    reasons: { backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden" },
    reasonRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 16 },
    reasonRowSelected: { backgroundColor: "rgba(61, 219, 133, 0.08)" },
    reasonRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    reasonLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    reasonLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text },
    submitBtn: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 17, alignItems: "center", marginTop: 8 },
    submitBtnDisabled: { backgroundColor: colors.surface },
    submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
    successContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 16 },
    successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.greenDim, borderWidth: 1.5, borderColor: colors.green, justifyContent: "center", alignItems: "center", marginBottom: 8 },
    successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.text },
    successSub: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 24 },
    doneBtn: { marginTop: 16, backgroundColor: colors.green, borderRadius: 14, paddingHorizontal: 48, paddingVertical: 16 },
    doneBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
  });
}
