import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

export default function NotificationsScreen() {
  const { settings, updateSetting } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Daily reminder</Text>
              <Text style={styles.rowSub}>Encouragement to post</Text>
            </View>
            <Switch
              value={settings.dailyReminder}
              onValueChange={(v) => updateSetting("dailyReminder", v)}
              trackColor={{ false: Colors.surfaceElevated, true: Colors.green }}
              thumbColor={Colors.text}
              ios_backgroundColor={Colors.surfaceElevated}
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
              onValueChange={(v) => updateSetting("postPerformance", v)}
              trackColor={{ false: Colors.surfaceElevated, true: Colors.green }}
              thumbColor={Colors.text}
              ios_backgroundColor={Colors.surfaceElevated}
            />
          </View>
        </View>
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
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowLeft: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
});
