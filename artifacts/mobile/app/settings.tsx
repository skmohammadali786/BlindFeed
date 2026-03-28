import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  label,
  subtitle,
  value,
  onToggle,
  onPress,
  destructive,
  rightText,
}: {
  label: string;
  subtitle?: string;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  rightText?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && onToggle === undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <Text style={[styles.settingLabel, destructive && styles.destructiveLabel]}>
          {label}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {onToggle !== undefined && value !== undefined && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: Colors.surfaceElevated, true: Colors.green }}
          thumbColor={Colors.text}
          ios_backgroundColor={Colors.surfaceElevated}
        />
      )}
      {onPress && onToggle === undefined && !rightText && (
        <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
      )}
      {rightText && (
        <Text style={styles.rightText}>{rightText}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { settings, updateSetting, resetUserId, clearAllData } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [showClearModal, setShowClearModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleClearData = async () => {
    await clearAllData();
    setShowClearModal(false);
  };

  const handleResetId = async () => {
    await resetUserId();
    setShowResetModal(false);
  };

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <SectionHeader title="APPEARANCE" />
        <View style={styles.card}>
          <SettingRow
            label="Dark mode"
            value={settings.darkMode}
            onToggle={(v) => updateSetting("darkMode", v)}
          />
        </View>

        {/* Content */}
        <SectionHeader title="CONTENT" />
        <View style={styles.card}>
          <SettingRow
            label="Content filter"
            value={settings.contentFilter}
            onToggle={(v) => updateSetting("contentFilter", v)}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Feed preferences"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Content filter settings"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Report content"
            onPress={() => router.push("/report")}
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.card}>
          <SettingRow
            label="Notification settings"
            onPress={() => router.push("/notifications")}
          />
        </View>

        {/* Data & Privacy */}
        <SectionHeader title="DATA & PRIVACY" />
        <View style={styles.card}>
          <SettingRow
            label="Data transparency"
            onPress={() => router.push("/identity")}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Clear cache"
            onPress={() => setShowClearModal(true)}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Delete all data"
            onPress={() => setShowClearModal(true)}
            destructive
          />
        </View>

        {/* About */}
        <SectionHeader title="ABOUT" />
        <View style={styles.card}>
          <SettingRow
            label="Community guidelines"
            onPress={() => router.push("/community-guidelines")}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Terms & Privacy"
            onPress={() => router.push("/terms")}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Send feedback"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Rate BlindFeed"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Version"
            rightText="1.0.0"
          />
        </View>

        {/* Reset ID */}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => setShowResetModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.resetBtnText}>Reset Anonymous ID</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Clear cache modal */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Feather name="trash-2" size={26} color={Colors.textSecondary} />
            </View>
            <Text style={styles.modalTitle}>Clear app data?</Text>
            <Text style={styles.modalSub}>
              This will remove cached content and reset your preferences
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowClearModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDestructiveBtn}
                onPress={handleClearData}
                activeOpacity={0.8}
              >
                <Text style={styles.modalDestructiveText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset ID modal */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, styles.modalIconDestructive]}>
              <Feather name="refresh-cw" size={26} color="#FF453A" />
            </View>
            <Text style={styles.modalTitle}>Reset your anonymous ID?</Text>
            <Text style={styles.modalSub}>
              You will lose your posting history and streak.{"\n"}This cannot be undone.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowResetModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Keep my ID</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDestructiveBtn}
                onPress={handleResetId}
                activeOpacity={0.8}
              >
                <Text style={styles.modalDestructiveText}>Reset anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    gap: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  settingLeft: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  destructiveLabel: {
    color: "#FF453A",
  },
  rightText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
  resetBtn: {
    marginTop: 28,
    backgroundColor: "rgba(255,69,58,0.1)",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.2)",
  },
  resetBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FF453A",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    gap: 12,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  modalIconDestructive: {
    backgroundColor: "rgba(255,69,58,0.12)",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  modalDestructiveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(255,69,58,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalDestructiveText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FF453A",
  },
});
