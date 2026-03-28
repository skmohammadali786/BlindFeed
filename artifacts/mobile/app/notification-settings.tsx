import { Feather } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DAILY_REMINDER_ID = "bf_daily_reminder";

async function scheduleDailyReminder() {
  await cancelDailyReminder();
  if (Platform.OS === "web") return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "BlindFeed — Daily check-in",
      body: "See what's on people's minds today. Completely anonymous.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

async function cancelDailyReminder() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch (_) {}
}

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { settings, updateSetting } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [permGranted, setPermGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      setPermGranted(false);
      return;
    }
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermGranted(status === "granted");
    });
  }, []);

  const handleDailyReminderToggle = async (value: boolean) => {
    updateSetting("dailyReminder", value);
    if (value) {
      await scheduleDailyReminder();
      const { status } = await Notifications.getPermissionsAsync();
      setPermGranted(status === "granted");
    } else {
      await cancelDailyReminder();
    }
  };

  const handlePostActivityToggle = (value: boolean) => {
    updateSetting("postPerformance", value);
  };

  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={{ width: 38 }} />
          </View>
        </FadeSlide>

        <ScrollView
          contentContainerStyle={{ paddingBottom: bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedListItem index={1}>
            <Text style={styles.sectionLabel}>Reminders</Text>
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.greenDim }]}>
                    <Feather name="sun" size={16} color={colors.green} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Daily reminder</Text>
                    <Text style={styles.rowSubtitle}>
                      Get a reminder at 9:00 AM every day to check the feed
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.dailyReminder}
                  onValueChange={handleDailyReminderToggle}
                  trackColor={{ false: colors.surfaceElevated, true: colors.green }}
                  thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                  ios_backgroundColor={colors.surfaceElevated}
                />
              </View>
            </View>
          </AnimatedListItem>

          <AnimatedListItem index={2}>
            <Text style={styles.sectionLabel}>Activity</Text>
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: "rgba(100,149,237,0.15)" }]}>
                    <Feather name="message-circle" size={16} color="#6495ED" />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Post activity</Text>
                    <Text style={styles.rowSubtitle}>
                      Get notified when someone comments on or reacts to your posts
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.postPerformance}
                  onValueChange={handlePostActivityToggle}
                  trackColor={{ false: colors.surfaceElevated, true: colors.green }}
                  thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                  ios_backgroundColor={colors.surfaceElevated}
                />
              </View>
            </View>
          </AnimatedListItem>

          <AnimatedListItem index={3}>
            <View style={styles.infoCard}>
              <Feather name="shield" size={14} color={colors.green} />
              <Text style={styles.infoText}>
                BlindFeed never uses notifications to reveal your identity. Notifications are sent without any identifying information.
              </Text>
            </View>
          </AnimatedListItem>
        </ScrollView>
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginLeft: 16,
      marginBottom: 6,
      marginTop: 20,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      marginHorizontal: 16,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      gap: 12,
    },
    rowLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    },
    rowText: { flex: 1, gap: 3 },
    rowTitle: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.text,
    },
    rowSubtitle: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 17,
    },
    permBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: "rgba(255,159,10,0.12)",
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 14,
    },
    permBannerText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "#FF9F0A",
      lineHeight: 19,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.greenDim,
      borderRadius: 14,
      marginHorizontal: 16,
      marginTop: 20,
      padding: 14,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 19,
    },
  });
}
