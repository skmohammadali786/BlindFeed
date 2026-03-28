import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const RULES = [
  { icon: "heart", text: "No abuse or harassment" },
  { icon: "alert-circle", text: "No spam or repetitive content" },
  { icon: "alert-triangle", text: "No harmful or dangerous content" },
  { icon: "eye-off", text: "Respect privacy and boundaries" },
];

export default function CommunityGuidelinesScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Guidelines</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.content, { paddingBottom: bottom + 24 }]}>
        {/* Shield icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <Feather name="shield" size={32} color={Colors.green} />
          </View>
        </View>

        <Text style={styles.title}>Keep it real.{"\n"}Keep it respectful.</Text>

        {/* Rules */}
        <View style={styles.rules}>
          {RULES.map((rule) => (
            <View key={rule.text} style={styles.ruleRow}>
              <View style={styles.ruleIcon}>
                <Feather name={rule.icon as any} size={18} color={Colors.green} />
              </View>
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>I understand</Text>
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
    padding: 28,
    alignItems: "center",
    gap: 24,
  },
  iconContainer: {
    marginTop: 16,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.greenDim,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 34,
  },
  rules: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  ruleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.greenDim,
    justifyContent: "center",
    alignItems: "center",
  },
  ruleText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  spacer: {
    flex: 1,
  },
  btn: {
    width: "100%",
    backgroundColor: Colors.green,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
});
