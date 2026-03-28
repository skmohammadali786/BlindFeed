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
import Colors from "@/constants/colors";

const REASONS = [
  { id: "spam", label: "Spam", icon: "alert-circle" },
  { id: "abuse", label: "Abuse or harassment", icon: "alert-triangle" },
  { id: "sensitive", label: "Sensitive content", icon: "eye-off" },
  { id: "other", label: "Other", icon: "more-horizontal" },
];

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <TouchableOpacity
          style={[styles.backBtn, { margin: 16 }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Feather name="check" size={30} color={Colors.green} />
          </View>
          <Text style={styles.successTitle}>Report submitted</Text>
          <Text style={styles.successSub}>
            Thank you for helping keep BlindFeed safe.{"\n"}We'll review this content shortly.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Content</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.content, { paddingBottom: bottom + 24 }]}>
        <Text style={styles.question}>Why are you reporting this content?</Text>

        <View style={styles.reasons}>
          {REASONS.map((reason, idx) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonRow,
                selected === reason.id && styles.reasonRowSelected,
                idx < REASONS.length - 1 && styles.reasonRowBorder,
              ]}
              onPress={() => setSelected(reason.id)}
              activeOpacity={0.8}
            >
              <View style={styles.reasonLeft}>
                <Feather
                  name={reason.icon as any}
                  size={18}
                  color={selected === reason.id ? Colors.green : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.reasonLabel,
                    selected === reason.id && styles.reasonLabelSelected,
                  ]}
                >
                  {reason.label}
                </Text>
              </View>
              {selected === reason.id && (
                <Feather name="check" size={18} color={Colors.green} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !selected && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={[styles.submitBtnText, !selected && styles.submitBtnTextDisabled]}>
            Submit Report
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  question: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  reasons: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  reasonRowSelected: {
    backgroundColor: "rgba(61, 219, 133, 0.08)",
  },
  reasonRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reasonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reasonLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  reasonLabelSelected: {
    color: Colors.green,
    fontFamily: "Inter_500Medium",
  },
  submitBtn: {
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  submitBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  successContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.greenDim,
    borderWidth: 1.5,
    borderColor: Colors.green,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  successSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  doneBtn: {
    marginTop: 16,
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
});
