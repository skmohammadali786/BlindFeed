import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { api } from "@/utils/api";
import { ScreenTransition, FadeSlide, AnimatedListItem, AnimatedPressable } from "@/components/Animations";

const REASONS = [
  { id: "spam", label: "Spam or misleading", icon: "alert-circle" },
  { id: "abuse", label: "Abuse or harassment", icon: "alert-triangle" },
  { id: "sensitive", label: "Sensitive content", icon: "eye-off" },
  { id: "misinformation", label: "Misinformation", icon: "info" },
  { id: "other", label: "Other", icon: "more-horizontal" },
];

export default function ReportScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const { postId } = useLocalSearchParams<{ postId: string }>();

  const [selected, setSelected] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    if (!postId) { setError("No post to report."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/posts/${postId}/report`, {
        reason: selected,
        description: description.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
              Thank you for helping keep BlindFeed safe.{"\n"}We'll review this content shortly.{"\n"}You'll be notified if any action is taken.
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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeSlide delay={60}>
            <Text style={styles.question}>Why are you reporting this content?</Text>
          </FadeSlide>

          <View style={styles.reasons}>
            {REASONS.map((reason, idx) => (
              <AnimatedListItem key={reason.id} index={idx}>
                <TouchableOpacity
                  style={[
                    styles.reasonRow,
                    selected === reason.id && styles.reasonRowSelected,
                    idx < REASONS.length - 1 && styles.reasonRowBorder,
                  ]}
                  onPress={() => setSelected(reason.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reasonLeft}>
                    <Feather name={reason.icon as never} size={18} color={selected === reason.id ? colors.green : colors.textSecondary} />
                    <Text style={[styles.reasonLabel, selected === reason.id && { color: colors.green, fontFamily: "JetBrainsMono_500Medium" }]}>
                      {reason.label}
                    </Text>
                  </View>
                  {selected === reason.id && <Feather name="check" size={18} color={colors.green} />}
                </TouchableOpacity>
              </AnimatedListItem>
            ))}
          </View>

          <FadeSlide delay={220}>
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Additional details (optional)</Text>
              <TextInput
                style={styles.descInput}
                placeholder="Describe the issue..."
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={400}
                textAlignVertical="top"
              />
              <Text style={styles.descCount}>{description.length}/400</Text>
            </View>
          </FadeSlide>

          {error && (
            <FadeSlide delay={0}>
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={15} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </FadeSlide>
          )}

          <FadeSlide delay={280}>
            <AnimatedPressable
              style={[styles.submitBtn, (!selected || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!selected || submitting}
              scaleTo={0.96}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={[styles.submitBtnText, !selected && { color: colors.textTertiary }]}>Submit Report</Text>
              )}
            </AnimatedPressable>
          </FadeSlide>
        </ScrollView>
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "JetBrainsMono_600SemiBold", color: colors.text },
    content: { padding: 20, gap: 16 },
    question: { fontSize: 14, fontFamily: "JetBrainsMono_400Regular", color: colors.textSecondary },
    reasons: { backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden" },
    reasonRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 16 },
    reasonRowSelected: { backgroundColor: "rgba(61, 219, 133, 0.08)" },
    reasonRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    reasonLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    reasonLabel: { fontSize: 15, fontFamily: "JetBrainsMono_400Regular", color: colors.text },
    descBox: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8 },
    descLabel: { fontSize: 13, fontFamily: "JetBrainsMono_500Medium", color: colors.textSecondary },
    descInput: {
      fontSize: 14, fontFamily: "JetBrainsMono_400Regular", color: colors.text,
      minHeight: 80, paddingTop: 4,
    },
    descCount: { fontSize: 11, fontFamily: "JetBrainsMono_400Regular", color: colors.textTertiary, textAlign: "right" },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,59,48,0.1)", borderRadius: 12, padding: 12 },
    errorText: { flex: 1, fontSize: 13, fontFamily: "JetBrainsMono_400Regular", color: "#FF3B30" },
    submitBtn: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 17, alignItems: "center", marginTop: 4 },
    submitBtnDisabled: { backgroundColor: colors.surface },
    submitBtnText: { fontSize: 16, fontFamily: "JetBrainsMono_600SemiBold", color: "#000" },
    successContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 16 },
    successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.greenDim, borderWidth: 1.5, borderColor: colors.green, justifyContent: "center", alignItems: "center", marginBottom: 8 },
    successTitle: { fontSize: 24, fontFamily: "JetBrainsMono_700Bold", color: colors.text },
    successSub: { fontSize: 15, fontFamily: "JetBrainsMono_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 24 },
    doneBtn: { marginTop: 16, backgroundColor: colors.green, borderRadius: 14, paddingHorizontal: 48, paddingVertical: 16 },
    doneBtnText: { fontSize: 16, fontFamily: "JetBrainsMono_600SemiBold", color: "#000" },
  });
}
