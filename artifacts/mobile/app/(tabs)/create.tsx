import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import Header from "@/components/Header";
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
  const bottomPadding = isWeb ? 34 : insets.bottom;

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

  const handleNewPost = () => {
    setContent("");
    setSubmitted(false);
  };

  const handleGoFeed = () => {
    router.push("/");
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <Header title="blindfeed" />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check" size={32} color={Colors.worthIt} />
          </View>
          <Text style={styles.successTitle}>Posted anonymously</Text>
          <Text style={styles.successSub}>
            Your thought is out there. No name. No pressure.{"\n"}It expires in 48 hours.
          </Text>
          <TouchableOpacity
            style={styles.feedBtn}
            onPress={handleGoFeed}
            activeOpacity={0.8}
          >
            <Text style={styles.feedBtnText}>See the feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={handleNewPost}
            activeOpacity={0.8}
          >
            <Text style={styles.anotherBtnText}>Write another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="new post"
        right={
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
            activeOpacity={0.8}
          >
            <Text style={[styles.postBtnText, !canSubmit && styles.postBtnTextDisabled]}>
              Post
            </Text>
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Anonymity notice */}
          <View style={styles.notice}>
            <Feather name="eye-off" size={14} color={Colors.textTertiary} />
            <Text style={styles.noticeText}>
              No username. No identity. Just your words.
            </Text>
          </View>

          {/* Text input */}
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

          {/* Rules */}
          <View style={styles.rules}>
            <Text style={styles.rulesTitle}>Ground rules</Text>
            <View style={styles.rule}>
              <Feather name="check-circle" size={14} color={Colors.textTertiary} />
              <Text style={styles.ruleText}>Ideas, observations, honest opinions</Text>
            </View>
            <View style={styles.rule}>
              <Feather name="check-circle" size={14} color={Colors.textTertiary} />
              <Text style={styles.ruleText}>Expires in 48 hours automatically</Text>
            </View>
            <View style={styles.rule}>
              <Feather name="x-circle" size={14} color={Colors.skip} />
              <Text style={styles.ruleText}>No harassment, hate, or personal attacks</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { paddingBottom: isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          <Text
            style={[
              styles.charCount,
              isNearLimit && styles.charCountWarning,
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
  scrollContent: {
    padding: 20,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noticeText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  input: {
    fontSize: 18,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    lineHeight: 28,
    minHeight: 160,
    textAlignVertical: "top",
    marginBottom: 28,
  },
  rules: {
    gap: 10,
  },
  rulesTitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ruleText: {
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
  charCountWarning: {
    color: "#F59E0B",
  },
  charCountError: {
    color: Colors.skip,
  },
  postBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: Colors.text,
    borderRadius: 20,
  },
  postBtnDisabled: {
    backgroundColor: Colors.border,
  },
  postBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.background,
  },
  postBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  successContainer: {
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
    backgroundColor: Colors.worthItBg,
    borderWidth: 1,
    borderColor: Colors.worthIt,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
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
    backgroundColor: Colors.text,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  feedBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.background,
  },
  anotherBtn: {
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
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
