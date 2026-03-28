import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { ScreenTransition, FadeSlide, AnimatedListItem } from "@/components/Animations";

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { settings, updateSetting } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;

  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={{ width: 38 }} />
          </View>
        </FadeSlide>

        <AnimatedListItem index={0}>
          <View style={styles.content}>
            <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Daily reminder</Text>
              <Text style={styles.rowSub}>Encouragement to post</Text>
            </View>
            <Switch
              value={settings.dailyReminder}
              onValueChange={(v) => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateSetting("dailyReminder", v);
              }}
              trackColor={{ false: colors.surfaceElevated, true: colors.green }}
              thumbColor={colors.text}
              ios_backgroundColor={colors.surfaceElevated}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Post performance</Text>
              <Text style={styles.rowSub}>Updates on your posts</Text>
            </View>
            <Switch
              value={settings.postPerformance}
              onValueChange={(v) => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateSetting("postPerformance", v);
              }}
              trackColor={{ false: colors.surfaceElevated, true: colors.green }}
              thumbColor={colors.text}
              ios_backgroundColor={colors.surfaceElevated}
            />
          </View>
        </View>
          </View>
        </AnimatedListItem>
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
    content: { padding: 16 },
    card: { backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16 },
    rowLeft: { flex: 1, gap: 3 },
    rowLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text },
    rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  });
}
