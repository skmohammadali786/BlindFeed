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
import { ScreenTransition, FadeSlide, AnimatedListItem } from "@/components/Animations";

export default function TermsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Terms & Privacy</Text>
            <View style={{ width: 38 }} />
          </View>
        </FadeSlide>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottom + 80 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Terms of Service</Text>
        <Text style={styles.body}>
          By using BlindFeed, you agree to share content responsibly. We do not track your identity, but we monitor for spam and abuse to maintain a healthy community.
        </Text>

        <Text style={styles.section}>Anonymous Identity</Text>
        <Text style={styles.body}>
          Your anonymous ID rotates every 7 days and is never linked to your real identity. Registration information (name, email, phone) is stored securely and used only for moderation — it is never visible to other users or shown in the app.
        </Text>

        <Text style={styles.section}>What We Store</Text>
        <View style={styles.dataList}>
          {[
            { icon: "edit-3", item: "Your posts (text + optional images)", kept: "48 hours" },
            { icon: "message-circle", item: "Comments and replies", kept: "48 hours" },
            { icon: "zap", item: "Reactions to posts", kept: "48 hours" },
            { icon: "user", item: "Registration info (moderation only)", kept: "Indefinitely" },
          ].map((d, i) => (
            <View key={i} style={[styles.dataRow, i < 3 && styles.dataRowBorder]}>
              <View style={styles.dataIcon}>
                <Feather name={d.icon as never} size={14} color={colors.green} />
              </View>
              <View style={styles.dataText}>
                <Text style={styles.dataItem}>{d.item}</Text>
                <Text style={styles.dataKept}>Kept: {d.kept}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Privacy Policy</Text>
        <Text style={styles.body}>
          We are committed to protecting your privacy. We do not sell your data. We do not show ads. We do not track you across apps or websites. Your anonymous ID is the only identifier we use in our system.
        </Text>

        <Text style={styles.section}>Content Policy</Text>
        <Text style={styles.body}>
          You own your content. By posting, you grant us a license to display it on the platform. We reserve the right to remove content that violates our community guidelines without notice.
        </Text>

        <View style={styles.badge}>
          <Feather name="shield" size={16} color={colors.green} />
          <Text style={styles.badgeText}>Your privacy is our top priority</Text>
        </View>
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
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
    section: { fontSize: 17, fontFamily: "JetBrainsMono_600SemiBold", color: colors.text, marginTop: 8 },
    body: { fontSize: 14, fontFamily: "JetBrainsMono_400Regular", color: colors.textSecondary, lineHeight: 22 },
    dataList: { backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden" },
    dataRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    dataRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    dataIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.greenDim, justifyContent: "center", alignItems: "center" },
    dataText: { flex: 1, gap: 2 },
    dataItem: { fontSize: 14, fontFamily: "JetBrainsMono_400Regular", color: colors.text },
    dataKept: { fontSize: 12, fontFamily: "JetBrainsMono_400Regular", color: colors.textTertiary },
    badge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.greenDim, borderRadius: 14, paddingVertical: 14, marginTop: 8 },
    badgeText: { fontSize: 14, fontFamily: "JetBrainsMono_500Medium", color: colors.green },
  });
}
