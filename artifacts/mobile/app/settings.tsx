import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenTransition, FadeSlide, AnimatedListItem } from "@/components/Animations";

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 16, marginBottom: 6, marginTop: 20 }}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const { colors, isDark, setDark } = useTheme();
  const { settings, updateSetting, resetUserId, clearAllData, tempUserId, logout } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [showClearModal, setShowClearModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);

  const styles = makeStyles(colors);

  const handleClearCache = async () => {
    setShowClearModal(false);
    await clearAllData();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Done", "Cache cleared successfully.");
  };

  const handleResetId = async () => {
    setShowResetModal(false);
    await resetUserId();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Done", "Your anonymous ID has been reset.");
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/");
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    await AsyncStorage.clear();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/");
  };

  const handleRateApp = () => {
    router.push("/rate");
  };

  const handleFeedback = () => {
    Linking.openURL("mailto:feedback@blindfeed.app?subject=BlindFeed Feedback").catch(() =>
      Alert.alert("Error", "Could not open email client.")
    );
  };

  const feedPrefLabel = { all: "All posts", text: "Text only", images: "Images only" };

  const SettingRow = ({
    label,
    subtitle,
    value,
    onToggle,
    onPress,
    destructive,
    rightText,
    chevron = true,
  }: {
    label: string;
    subtitle?: string;
    value?: boolean;
    onToggle?: (v: boolean) => void;
    onPress?: () => void;
    destructive?: boolean;
    rightText?: string;
    chevron?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && onToggle === undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <Text style={[styles.settingLabel, destructive && { color: "#FF3B30" }]}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {onToggle !== undefined && value !== undefined ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.surfaceElevated, true: colors.green }}
          thumbColor={colors.text}
          ios_backgroundColor={colors.surfaceElevated}
        />
      ) : (
        <View style={styles.settingRight}>
          {rightText && <Text style={styles.settingRightText}>{rightText}</Text>}
          {onPress && chevron && <Feather name="chevron-right" size={16} color={colors.textTertiary} />}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={{ width: 32 }} />
          </View>
        </FadeSlide>

        <ScrollView
          contentContainerStyle={{ paddingBottom: bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedListItem index={0}>
            <SectionHeader title="Appearance" colors={colors} />
            <View style={styles.section}>
              <SettingRow
                label="Dark mode"
                subtitle={isDark ? "Currently dark" : "Currently light"}
                value={isDark}
                onToggle={(v) => setDark(v)}
              />
            </View>
          </AnimatedListItem>

          <AnimatedListItem index={1}>
            <SectionHeader title="Content" colors={colors} />
            <View style={styles.section}>
              <SettingRow
                label="Content filter"
                subtitle="Filter potentially sensitive content"
                value={settings.contentFilter}
                onToggle={(v) => updateSetting("contentFilter", v)}
              />
              <SettingRow
                label="Feed preference"
                subtitle={feedPrefLabel[settings.feedPreference ?? "all"]}
                onPress={() => setShowFeedModal(true)}
              />
            </View>
          </AnimatedListItem>

          <AnimatedListItem index={2}>
            <SectionHeader title="Notifications" colors={colors} />
            <View style={styles.section}>
              <SettingRow
                label="Notification settings"
                subtitle="Daily reminders, post activity"
                onPress={() => router.push("/notifications")}
              />
            </View>
          </AnimatedListItem>

          <AnimatedListItem index={3}>
            <SectionHeader title="Data & Privacy" colors={colors} />
            <View style={styles.section}>
              <SettingRow
                label="Your anonymous ID"
                subtitle={tempUserId}
                onPress={() => router.push("/identity")}
              />
              <SettingRow
                label="Data transparency"
                subtitle="Review what we store"
                onPress={() => router.push("/terms")}
              />
              <SettingRow
                label="Clear cache"
                subtitle="Clear local cached data"
                onPress={() => setShowClearModal(true)}
              />
              <SettingRow
                label="Reset anonymous ID"
                subtitle="Get a new temporary identity"
                onPress={() => setShowResetModal(true)}
              />
              <SettingRow
                label="Log out"
                subtitle="Sign out and return to login"
                onPress={() => setShowLogoutModal(true)}
              />
              <SettingRow
                label="Delete account"
                subtitle="Permanently remove all your data"
                onPress={() => setShowDeleteModal(true)}
                destructive
              />
            </View>
          </AnimatedListItem>

          <AnimatedListItem index={4}>
            <SectionHeader title="About" colors={colors} />
            <View style={styles.section}>
              <SettingRow label="Community guidelines" onPress={() => router.push("/community-guidelines")} />
              <SettingRow label="Terms & Privacy" onPress={() => router.push("/terms")} />
              <SettingRow label="Rate BlindFeed" onPress={handleRateApp} />
              <SettingRow label="Send feedback" onPress={handleFeedback} />
              <SettingRow label="Version" rightText="1.0.0" chevron={false} />
            </View>
          </AnimatedListItem>
        </ScrollView>

      {/* Clear Cache Modal */}
      <Modal visible={showClearModal} transparent animationType="fade" onRequestClose={() => setShowClearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Clear Cache?</Text>
            <Text style={styles.modalBody}>This will clear locally cached data. Your posts on the feed are not affected.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowClearModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleClearCache}>
                <Text style={styles.modalConfirmText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset ID Modal */}
      <Modal visible={showResetModal} transparent animationType="fade" onRequestClose={() => setShowResetModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Reset Anonymous ID?</Text>
            <Text style={styles.modalBody}>You'll get a new temporary ID. Your previous posts will no longer appear as yours in the app.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowResetModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleResetId}>
                <Text style={styles.modalConfirmText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalBody}>You'll need your email/phone number and password to log back in. Your posts and settings will be saved.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleLogout}>
                <Text style={styles.modalConfirmText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.modalBody}>This will permanently delete all your local data and sign you out. This action cannot be undone.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: "#FF3B30" }]} onPress={handleDeleteAccount}>
                <Text style={styles.modalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feed Preference Modal */}
      <Modal visible={showFeedModal} transparent animationType="fade" onRequestClose={() => setShowFeedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Feed Preference</Text>
            {(["all", "text", "images"] as const).map((pref) => (
              <TouchableOpacity
                key={pref}
                style={styles.feedPrefOption}
                onPress={() => {
                  updateSetting("feedPreference", pref);
                  setShowFeedModal(false);
                }}
              >
                <Text style={[styles.feedPrefLabel, settings.feedPreference === pref && { color: colors.green }]}>
                  {feedPrefLabel[pref]}
                </Text>
                {settings.feedPreference === pref && (
                  <Feather name="check" size={16} color={colors.green} />
                )}
              </TouchableOpacity>
            ))}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
            <TouchableOpacity
              style={styles.feedPrefOption}
              onPress={() => {
                updateSetting("feedPreference", "all");
                updateSetting("contentFilter", true);
                setShowFeedModal(false);
              }}
            >
              <Text style={[styles.feedPrefLabel, { color: "#FF3B30" }]}>Reset to defaults</Text>
              <Feather name="refresh-cw" size={15} color="#FF3B30" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowFeedModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      marginHorizontal: 16,
      overflow: "hidden",
    },
    sectionHeader: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginLeft: 16,
      marginBottom: 6,
      marginTop: 20,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingLeft: { flex: 1, gap: 2, marginRight: 12 },
    settingLabel: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.text,
    },
    settingSubtitle: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    settingRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    settingRightText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 24,
      width: "100%",
      gap: 12,
    },
    modalTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      textAlign: "center",
    },
    modalBody: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      alignItems: "center",
    },
    modalCancelText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.text,
    },
    modalConfirm: {
      flex: 1,
      paddingVertical: 13,
      backgroundColor: colors.green,
      borderRadius: 12,
      alignItems: "center",
    },
    modalConfirmText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#000",
    },
    feedPrefOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    feedPrefLabel: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.text,
    },
  });
}
