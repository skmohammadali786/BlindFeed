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
import Colors from "@/constants/colors";

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.section}>Terms of Service</Text>

        <Text style={styles.body}>
          By using BlindFeed, you agree to share content responsibly. We do not track your identity, but we monitor for spam and abuse to maintain a healthy community.
        </Text>

        <Text style={styles.body}>
          All content is anonymous. You are responsible for what you post. Hate speech, harassment, and illegal content are strictly prohibited.
        </Text>

        <Text style={styles.body}>
          Your temporary ID resets every 7 days. This helps prevent spam while maintaining complete anonymity.
        </Text>

        <Text style={[styles.section, { marginTop: 24 }]}>Privacy Policy</Text>

        <Text style={styles.body}>
          BlindFeed does not collect personal information. We do not know who you are.
        </Text>

        <Text style={styles.body}>
          All your posts and reactions are stored locally on your device using AsyncStorage. No data is sent to external servers unless content is flagged for moderation review.
        </Text>

        <Text style={styles.body}>
          Your temporary user ID is generated randomly and resets every 7 days. It cannot be traced back to you personally.
        </Text>

        <Text style={styles.body}>
          We may collect anonymous aggregate usage statistics to improve the app. This data contains no personally identifiable information.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + 12 }]}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>I Understand</Text>
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
  scroll: { flex: 1 },
  content: {
    padding: 24,
    gap: 16,
  },
  section: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  btn: {
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
