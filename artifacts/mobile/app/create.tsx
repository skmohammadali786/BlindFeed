import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useTheme } from "@/context/ThemeContext";
import { useApp, DraftPost } from "@/context/AppContext";
import { requestUploadUrl } from "@/utils/api";
import { ScreenTransition, FadeSlide, AnimatedListItem, AnimatedPressable, PulseView } from "@/components/Animations";

const MAX_CHARS = 500;
const MIN_CHARS = 10;

const EXPIRY_OPTIONS: { label: string; value: number | null }[] = [
  { label: "1 hour", value: 1 },
  { label: "6 hours", value: 6 },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "48 hours", value: 48 },
  { label: "7 days", value: 168 },
  { label: "Never", value: null },
];

export default function CreateScreen() {
  const { colors } = useTheme();
  const { addPost, drafts, publishDraft, deleteDraft } = useApp();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(48);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const charCount = content.length;
  const canSubmit = charCount >= MIN_CHARS && charCount <= MAX_CHARS && !posting;
  const isNearLimit = charCount > MAX_CHARS * 0.8;

  const pickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert("Permission needed", "Allow access to photos to add an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) setSelectedImage(result.assets[0]);
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !canSubmit) return;
    if (!isDraft && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setPosting(true);
    try {
      let imageUrl: string | null = null;

      if (selectedImage && !isDraft) {
        try {
          const { uploadURL, objectPath } = await requestUploadUrl(
            "post-image.jpg",
            selectedImage.fileSize ?? 0,
            selectedImage.mimeType ?? "image/jpeg",
          );
          const blob = await fetch(selectedImage.uri).then((r) => r.blob());
          await fetch(uploadURL, {
            method: "PUT",
            body: blob,
            headers: { "Content-Type": selectedImage.mimeType ?? "image/jpeg" },
          });
          imageUrl = objectPath;
        } catch {
          Alert.alert("Image upload failed", "Your post will be submitted without the image.");
        }
      }

      await addPost(content.trim(), imageUrl, isDraft, isDraft ? 48 : expiresInHours);
      if (isDraft) {
        Alert.alert("Saved", "Draft saved successfully.");
        router.back();
      } else {
        setSubmitted(true);
      }
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const loadDraft = (draft: DraftPost) => {
    setContent(draft.content);
    setShowDrafts(false);
  };

  const styles = makeStyles(colors);

  if (submitted) {
    return (
      <ScreenTransition>
        <View style={[styles.container, { paddingTop: top }]}>
          <View style={styles.successContainer}>
            <FadeSlide delay={0} style={{ alignItems: "center", gap: 16, width: "100%" }}>
              <PulseView>
                <View style={styles.successIcon}>
                  <Feather name="check" size={36} color="#000" />
                </View>
              </PulseView>
              <Text style={styles.successTitle}>Your post is live</Text>
              <Text style={styles.successSub}>Anonymous and real</Text>
              <AnimatedPressable style={styles.feedBtn} onPress={() => router.replace("/feed")} scaleTo={0.96}>
                <Text style={styles.feedBtnText}>Back to feed</Text>
              </AnimatedPressable>
            </FadeSlide>
          </View>
        </View>
      </ScreenTransition>
    );
  }

  if (showDrafts) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowDrafts(false)} style={styles.closeBtn}>
            <Feather name="arrow-left" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Drafts</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottom + 24 }}>
          {drafts.length === 0 ? (
            <View style={styles.noDrafts}>
              <Feather name="file-text" size={36} color={colors.textTertiary} />
              <Text style={styles.noDraftsText}>No drafts yet</Text>
            </View>
          ) : (
            drafts.map((draft) => (
              <View key={draft.id} style={styles.draftCard}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => loadDraft(draft)}>
                  <Text style={styles.draftContent} numberOfLines={3}>{draft.content}</Text>
                  <Text style={styles.draftTime}>
                    {new Date(draft.createdAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <View style={styles.draftActions}>
                  <TouchableOpacity
                    style={styles.draftPublish}
                    onPress={async () => { await publishDraft(draft.id); }}
                  >
                    <Text style={styles.draftPublishText}>Publish</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteDraft(draft.id)}>
                    <Feather name="trash-2" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New post</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
          onPress={() => handleSubmit(false)}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={[styles.postBtnText, !canSubmit && styles.postBtnTextDisabled]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.textInput}
          value={content}
          onChangeText={setContent}
          placeholder="What's on your mind? It's anonymous."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={MAX_CHARS + 1}
          autoFocus
          textAlignVertical="top"
        />

        <Text style={[styles.charCount, isNearLimit && styles.charCountWarning, charCount > MAX_CHARS && styles.charCountError]}>
          {charCount}/{MAX_CHARS}
        </Text>

        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} contentFit="cover" />
            <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
              <Feather name="x" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={pickImage}>
            <Feather name="image" size={20} color={selectedImage ? colors.green : colors.textSecondary} />
            <Text style={[styles.toolbarBtnText, selectedImage && { color: colors.green }]}>
              {selectedImage ? "Change photo" : "Add photo"}
            </Text>
          </TouchableOpacity>

          <View style={styles.toolbarRight}>
            {drafts.length > 0 && (
              <TouchableOpacity style={styles.draftsBadge} onPress={() => setShowDrafts(true)}>
                <Feather name="file-text" size={14} color={colors.textSecondary} />
                <Text style={styles.draftsBadgeText}>{drafts.length}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.saveDraftBtn}
              onPress={() => handleSubmit(true)}
              disabled={charCount < MIN_CHARS}
            >
              <Text style={[styles.saveDraftText, charCount < MIN_CHARS && { opacity: 0.4 }]}>Save draft</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.expiryRow} onPress={() => setShowExpiryModal(true)}>
          <Feather name="clock" size={14} color={colors.textSecondary} />
          <Text style={styles.expiryLabel}>Auto-delete after</Text>
          <View style={styles.expiryChip}>
            <Text style={styles.expiryChipText}>
              {EXPIRY_OPTIONS.find((o) => o.value === expiresInHours)?.label ?? "48 hours"}
            </Text>
            <Feather name="chevron-down" size={12} color={colors.green} />
          </View>
        </TouchableOpacity>

        <View style={styles.anonBadge}>
          <Feather name="eye-off" size={12} color={colors.textTertiary} />
          <Text style={styles.anonText}>Posted anonymously. No one knows it's you.</Text>
        </View>

        <Modal visible={showExpiryModal} transparent animationType="fade" onRequestClose={() => setShowExpiryModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Auto-delete after</Text>
              {EXPIRY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={String(opt.value ?? "never")}
                  style={styles.expiryOption}
                  onPress={() => {
                    setExpiresInHours(opt.value);
                    setShowExpiryModal(false);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.expiryOptionText, expiresInHours === opt.value && { color: colors.green }]}>
                    {opt.label}
                  </Text>
                  {expiresInHours === opt.value && <Feather name="check" size={16} color={colors.green} />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowExpiryModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: { padding: 4 },
    headerTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    postBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.green,
      borderRadius: 20,
      minWidth: 64,
      alignItems: "center",
    },
    postBtnDisabled: { opacity: 0.4 },
    postBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#000",
    },
    postBtnTextDisabled: { opacity: 0.5 },
    textInput: {
      fontSize: 18,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      minHeight: 160,
      paddingTop: 16,
      lineHeight: 28,
    },
    charCount: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      alignSelf: "flex-end",
      marginTop: 4,
    },
    charCountWarning: { color: "#FF9500" },
    charCountError: { color: "#FF3B30" },
    imagePreviewContainer: {
      marginTop: 12,
      position: "relative",
    },
    imagePreview: {
      width: "100%",
      height: 200,
      borderRadius: 12,
    },
    removeImage: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    toolbarBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 6,
    },
    toolbarBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    toolbarRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    draftsBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    draftsBadgeText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
    },
    saveDraftBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    saveDraftText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    anonBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 12,
    },
    anonText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    expiryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    expiryLabel: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    expiryChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.greenDim,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    expiryChipText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
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
      padding: 20,
      width: "100%",
      gap: 4,
    },
    modalTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    expiryOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    expiryOptionText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.text,
    },
    modalCancel: {
      marginTop: 8,
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
    successContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
      paddingHorizontal: 32,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.green,
      justifyContent: "center",
      alignItems: "center",
    },
    successTitle: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: -0.5,
    },
    successSub: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    feedBtn: {
      marginTop: 16,
      paddingHorizontal: 32,
      paddingVertical: 14,
      backgroundColor: colors.green,
      borderRadius: 16,
    },
    feedBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#000",
    },
    noDrafts: {
      paddingTop: 80,
      alignItems: "center",
      gap: 12,
    },
    noDraftsText: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    draftCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    draftContent: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 20,
    },
    draftTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginTop: 6,
    },
    draftActions: {
      alignItems: "flex-end",
      gap: 12,
    },
    draftPublish: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.greenDim,
      borderRadius: 12,
    },
    draftPublishText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
    },
  });
}
