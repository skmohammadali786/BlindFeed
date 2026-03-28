import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const MAX_CHARS = 500;
const MIN_CHARS = 10;

export default function CreateScreen() {
  const { addPost } = useApp();
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const charCount = content.length;
  const canSubmit = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const isNearLimit = charCount > MAX_CHARS * 0.8;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    addPost(content.trim());
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check" size={32} color={Colors.green} />
          </View>
          <Text style={styles.successTitle}>Posted anonymously</Text>
          <Text style={styles.successSub}>
            Your thought is out there.{"\n"}No name. No pressure. Expires in 48h.
          </Text>
          <TouchableOpacity
            style={styles.feedBtn}
            onPress={() => router.replace("/feed")}
            activeOpacity={0.85}
          >
            <Text style={styles.feedBtnText}>See the feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={() => setSubmitted(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.anotherBtnText}>Write another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New post</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <Text style={[styles.postBtnText, !canSubmit && styles.postBtnTextDisabled]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Anon badge */}
          <View style={styles.anonBadge}>
            <Feather name="eye-off" size={13} color={Colors.textTertiary} />
            <Text style={styles.anonText}>Anonymous · Expires in 48 hours</Text>
          </View>

          {/* Input */}
          <TextInput
            style={styles.input}
            placeholder="What's worth saying anonymously?"
            placeholderTextColor={Colors.textTertiary}
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={MAX_CHARS}
            autoFocus
            textAlignVertical="top"
          />

          {/* Guidelines */}
          <View style={styles.guidelines}>
            <Text style={styles.guidelinesTitle}>Guidelines</Text>
            <View style={styles.guidelineRow}>
              <Feather name="check-circle" size={13} color={Colors.textTertiary} />
              <Text style={styles.guidelineText}>Ideas, observations, honest takes</Text>
            </View>
            <View style={styles.guidelineRow}>
              <Feather name="x-circle" size={13} color="#FF453A" />
              <Text style={styles.guidelineText}>No harassment or personal attacks</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: bottom }]}>
          <Text
            style={[
              styles.charCount,
              isNearLimit && styles.charCountWarn,
              charCount >= MAX_CHARS && styles.charCountError,
            ]}
          >
            {charCount}/{MAX_CHARS}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  postBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.green,
    borderRadius: 20,
  },
  postBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  postBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  postBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  scrollContent: {
    padding: 20,
  },
  anonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  anonText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  input: {
    fontSize: 19,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    lineHeight: 30,
    minHeight: 180,
    textAlignVertical: "top",
    marginBottom: 28,
  },
  guidelines: {
    gap: 10,
  },
  guidelinesTitle: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  guidelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guidelineText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: "flex-end",
    backgroundColor: Colors.background,
  },
  charCount: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  charCountWarn: { color: "#FF9F0A" },
  charCountError: { color: "#FF453A" },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.greenDim,
    borderWidth: 1.5,
    borderColor: Colors.green,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  successSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  feedBtn: {
    marginTop: 16,
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  feedBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  anotherBtn: {
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  anotherBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
});
