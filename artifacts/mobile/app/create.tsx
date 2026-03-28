import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { requestUploadUrl, ApiError } from "@/utils/api";
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
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(48);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [rateLimitMs, setRateLimitMs] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());
  const [scheduledPosted, setScheduledPosted] = useState(false);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  React.useEffect(() => {
    if (!rateLimitMs) return;
    const t = setInterval(() => {
      setRateLimitMs((prev) => {
        if (!prev || prev <= 1000) return null;
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [rateLimitMs]);
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const charCount = content.length;
  const canSubmit = charCount >= MIN_CHARS && charCount <= MAX_CHARS && !posting;
  const isNearLimit = charCount > MAX_CHARS * 0.8;
  const isRateLimited = rateLimitMs !== null && rateLimitMs > 0;
  const rateLimitCountdown = rateLimitMs
    ? `${Math.floor(rateLimitMs / 60000)}:${String(Math.floor((rateLimitMs % 60000) / 1000)).padStart(2, "0")}`
    : "";
  const canPost = canSubmit && !isRateLimited;

  const MAX_IMAGES = 3;
  const MAX_VIDEO_DURATION_SEC = 60;

  const pickImages = async () => {
    if (selectedImages.length >= MAX_IMAGES) return;
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert("Permission needed", "Allow access to photos to add images.");
      return;
    }
    const remaining = MAX_IMAGES - selectedImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setSelectedImages((prev) => [...prev, ...result.assets].slice(0, MAX_IMAGES));
    }
  };

  const pickVideo = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert("Permission needed", "Allow access to media to add a video.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "videos",
      quality: 0.8,
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const durationSec = (asset.duration ?? 0);
      if (durationSec > MAX_VIDEO_DURATION_SEC) {
        Alert.alert("Video too long", `Please select a video under ${MAX_VIDEO_DURATION_SEC} seconds.`);
        return;
      }
      setSelectedVideo(asset);
    }
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !canSubmit) return;
    if (!isDraft && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (!isDraft) {
        const uploadedImageUrls: string[] = [];
        for (const img of selectedImages) {
          try {
            const { uploadURL, objectPath } = await requestUploadUrl(
              "post-image.jpg",
              img.fileSize ?? 0,
              img.mimeType ?? "image/jpeg",
            );
            const blob = await fetch(img.uri).then((r) => r.blob());
            await fetch(uploadURL, {
              method: "PUT",
              body: blob,
              headers: { "Content-Type": img.mimeType ?? "image/jpeg" },
            });
            uploadedImageUrls.push(objectPath);
          } catch {
          }
        }
        if (uploadedImageUrls.length === 1) {
          imageUrl = uploadedImageUrls[0];
        } else if (uploadedImageUrls.length > 1) {
          imageUrl = JSON.stringify(uploadedImageUrls);
        }

        if (selectedVideo) {
          try {
            const { uploadURL, objectPath } = await requestUploadUrl(
              "post-video.mp4",
              selectedVideo.fileSize ?? 0,
              selectedVideo.mimeType ?? "video/mp4",
            );
            const blob = await fetch(selectedVideo.uri).then((r) => r.blob());
            await fetch(uploadURL, {
              method: "PUT",
              body: blob,
              headers: { "Content-Type": selectedVideo.mimeType ?? "video/mp4" },
            });
            videoUrl = objectPath;
          } catch {
          }
        }
      }

      await addPost(content.trim(), imageUrl, videoUrl, isDraft, isDraft ? 48 : expiresInHours, isDraft ? null : scheduledAt);
      if (isDraft) {
        Alert.alert("Saved", "Draft saved successfully.");
        router.back();
      } else if (scheduledAt) {
        setScheduledPosted(true);
      } else {
        setSubmitted(true);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429 && err.retryAfterMs) {
        setRateLimitMs(err.retryAfterMs);
      } else {
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to post. Please try again.");
      }
    } finally {
      setPosting(false);
    }
  };

  const loadDraft = (draft: DraftPost) => {
    setContent(draft.content);
    setShowDrafts(false);
  };

  const formatScheduledAt = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days === 0) return `Today at ${timeStr}`;
    if (days === 1) return `Tomorrow at ${timeStr}`;
    if (days === 2) return `Day after tomorrow at ${timeStr}`;
    if (days < 7) return `${date.toLocaleDateString([], { weekday: "long" })} at ${timeStr}`;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
  };

  const applyPreset = (presetDate: Date) => {
    setScheduledAt(presetDate);
    setPickerDate(presetDate);
    setShowScheduleModal(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getSchedulePresets = (): { label: string; date: Date }[] => {
    const now = new Date();
    const tonight = new Date(now); tonight.setHours(20, 0, 0, 0);
    const tomorrowAM = new Date(now); tomorrowAM.setDate(now.getDate() + 1); tomorrowAM.setHours(9, 0, 0, 0);
    const tomorrowPM = new Date(now); tomorrowPM.setDate(now.getDate() + 1); tomorrowPM.setHours(20, 0, 0, 0);
    const dayAfter = new Date(now); dayAfter.setDate(now.getDate() + 2); dayAfter.setHours(9, 0, 0, 0);
    const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7); nextWeek.setHours(9, 0, 0, 0);

    return [
      ...(tonight.getTime() > now.getTime() + 5 * 60 * 1000 ? [{ label: "Tonight at 8:00 PM", date: tonight }] : []),
      { label: "Tomorrow at 9:00 AM", date: tomorrowAM },
      { label: "Tomorrow at 8:00 PM", date: tomorrowPM },
      { label: "Day after tomorrow 9:00 AM", date: dayAfter },
      { label: "Next week 9:00 AM", date: nextWeek },
    ];
  };

  const styles = makeStyles(colors);

  if (scheduledPosted && scheduledAt) {
    return (
      <ScreenTransition>
        <View style={[styles.container, { paddingTop: top }]}>
          <View style={styles.successContainer}>
            <FadeSlide delay={0} style={{ alignItems: "center", gap: 16, width: "100%" }}>
              <PulseView>
                <View style={[styles.successIcon, { backgroundColor: "#1C3D5A" }]}>
                  <Feather name="clock" size={36} color="#4ade80" />
                </View>
              </PulseView>
              <Text style={styles.successTitle}>Post scheduled!</Text>
              <Text style={[styles.successSub, { textAlign: "center" }]}>
                Will go live {formatScheduledAt(scheduledAt)}
              </Text>
              <View style={styles.scheduledInfoBox}>
                <Feather name="eye-off" size={14} color={colors.textSecondary} />
                <Text style={styles.scheduledInfoText}>
                  Your post is saved and will appear in the feed automatically at the scheduled time.
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
                <AnimatedPressable
                  style={[styles.feedBtn, { flex: 1, backgroundColor: colors.surface }]}
                  onPress={() => router.replace("/scheduled-posts" as any)}
                  scaleTo={0.96}
                >
                  <Text style={[styles.feedBtnText, { color: colors.text }]}>View scheduled</Text>
                </AnimatedPressable>
                <AnimatedPressable style={[styles.feedBtn, { flex: 1 }]} onPress={() => router.replace("/feed")} scaleTo={0.96}>
                  <Text style={styles.feedBtnText}>Go to feed</Text>
                </AnimatedPressable>
              </View>
            </FadeSlide>
          </View>
        </View>
      </ScreenTransition>
    );
  }

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
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={() => { if (canPost) setShowPreview(true); }}
          disabled={!canPost}
          activeOpacity={0.85}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}>Preview</Text>
          )}
        </TouchableOpacity>
      </View>

      {isRateLimited && (
        <View style={styles.rateLimitBanner}>
          <Feather name="clock" size={14} color="#FF9F0A" />
          <Text style={styles.rateLimitText}>
            Post limit reached — try again in {rateLimitCountdown}
          </Text>
        </View>
      )}

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

        {(selectedImages.length > 0 || selectedVideo) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaRow}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            {selectedImages.map((img, idx) => (
              <View key={idx} style={styles.mediaThumbnailWrap}>
                <Image source={{ uri: img.uri }} style={styles.mediaThumbnail} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeThumb}
                  onPress={() => setSelectedImages((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Feather name="x" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {selectedVideo && (
              <View style={styles.mediaThumbnailWrap}>
                <View style={[styles.mediaThumbnail, styles.videoThumb]}>
                  <Feather name="play-circle" size={28} color="#fff" />
                  {selectedVideo.duration !== undefined && (
                    <Text style={styles.videoDuration}>
                      {Math.round(selectedVideo.duration)}s
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeThumb}
                  onPress={() => setSelectedVideo(null)}
                >
                  <Feather name="x" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={pickImages}
            disabled={selectedImages.length >= MAX_IMAGES}
          >
            <Feather name="image" size={20} color={selectedImages.length > 0 ? colors.green : selectedImages.length >= MAX_IMAGES ? colors.textTertiary : colors.textSecondary} />
            <Text style={[styles.toolbarBtnText, selectedImages.length > 0 && { color: colors.green }]}>
              {selectedImages.length > 0 ? `Photos (${selectedImages.length}/3)` : "Add photos"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={selectedVideo ? () => setSelectedVideo(null) : pickVideo}
          >
            <Feather name="video" size={20} color={selectedVideo ? colors.green : colors.textSecondary} />
            <Text style={[styles.toolbarBtnText, selectedVideo && { color: colors.green }]}>
              {selectedVideo ? "Remove video" : "Add video"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setShowScheduleModal(true)}>
            <Feather name="clock" size={20} color={scheduledAt ? colors.green : colors.textSecondary} />
            <Text style={[styles.toolbarBtnText, scheduledAt && { color: colors.green }]}>
              {scheduledAt ? "Reschedule" : "Schedule"}
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

        {scheduledAt && (
          <TouchableOpacity
            style={[styles.scheduledBanner, { backgroundColor: colors.greenDim }]}
            onPress={() => setShowScheduleModal(true)}
          >
            <Feather name="clock" size={14} color={colors.green} />
            <Text style={[styles.scheduledBannerText, { color: colors.green }]}>
              Scheduled: {formatScheduledAt(scheduledAt)}
            </Text>
            <TouchableOpacity onPress={() => setScheduledAt(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={colors.green} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

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

        <Modal visible={showScheduleModal} transparent animationType="slide" onRequestClose={() => setShowScheduleModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modal, { maxHeight: "85%" }]}>
              <Text style={styles.modalTitle}>Schedule post</Text>
              <Text style={[styles.scheduleSubtitle, { color: colors.textSecondary }]}>
                Pick when your post goes live in the feed
              </Text>

              {getSchedulePresets().map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.schedulePreset, scheduledAt?.toISOString() === preset.date.toISOString() && { backgroundColor: colors.greenDim, borderColor: colors.green }]}
                  onPress={() => applyPreset(preset.date)}
                >
                  <Feather name="clock" size={15} color={scheduledAt?.toISOString() === preset.date.toISOString() ? colors.green : colors.textSecondary} />
                  <Text style={[styles.schedulePresetText, scheduledAt?.toISOString() === preset.date.toISOString() && { color: colors.green }]}>
                    {preset.label}
                  </Text>
                  {scheduledAt?.toISOString() === preset.date.toISOString() && (
                    <Feather name="check" size={15} color={colors.green} />
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.scheduleDivider}>
                <View style={[styles.scheduleDividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.scheduleDividerText, { color: colors.textTertiary }]}>or pick custom time</Text>
                <View style={[styles.scheduleDividerLine, { backgroundColor: colors.border }]} />
              </View>

              {Platform.OS !== "web" ? (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.schedulePreset, { justifyContent: "space-between" }]}
                    onPress={() => { setShowDatePicker(true); }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Feather name="calendar" size={15} color={colors.textSecondary} />
                      <Text style={styles.schedulePresetText}>
                        {pickerDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    </View>
                    <Feather name="chevron-down" size={15} color={colors.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.schedulePreset, { justifyContent: "space-between" }]}
                    onPress={() => { setShowTimePicker(true); }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Feather name="clock" size={15} color={colors.textSecondary} />
                      <Text style={styles.schedulePresetText}>
                        {pickerDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <Feather name="chevron-down" size={15} color={colors.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.schedulePreset, { backgroundColor: colors.greenDim, borderColor: colors.green, justifyContent: "center", gap: 8, flexDirection: "row" }]}
                    onPress={() => {
                      if (pickerDate.getTime() <= Date.now()) {
                        Alert.alert("Invalid time", "Please select a time in the future.");
                        return;
                      }
                      applyPreset(pickerDate);
                    }}
                  >
                    <Feather name="check" size={15} color={colors.green} />
                    <Text style={[styles.schedulePresetText, { color: colors.green }]}>Set this custom time</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {scheduledAt && (
                <TouchableOpacity
                  style={styles.scheduleRemoveBtn}
                  onPress={() => { setScheduledAt(null); setShowScheduleModal(false); }}
                >
                  <Feather name="x-circle" size={15} color="#FF3B30" />
                  <Text style={styles.scheduleRemoveBtnText}>Remove schedule (post now)</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowScheduleModal(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {showDatePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) {
                const updated = new Date(pickerDate);
                updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setPickerDate(updated);
              }
            }}
          />
        )}

        {showTimePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            onChange={(_, date) => {
              setShowTimePicker(false);
              if (date) {
                const updated = new Date(pickerDate);
                updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
                setPickerDate(updated);
              }
            }}
          />
        )}

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

      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPreview(false)}
        statusBarTranslucent
      >
        <View style={[styles.previewScreen, { paddingTop: top, paddingBottom: bottom }]}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.closeBtn}>
              <Feather name="arrow-left" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Post preview</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.previewHint}>
            <Feather name="eye" size={13} color={colors.textTertiary} />
            <Text style={styles.previewHintText}>This is exactly how your post will appear</Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
              <View style={styles.previewCardTop}>
                <View style={[styles.previewAvatarDot, { backgroundColor: colors.green }]} />
                <Text style={[styles.previewUserId, { color: colors.green }]}>You</Text>
                <Text style={[styles.previewDot, { color: colors.textTertiary }]}>·</Text>
                <Text style={[styles.previewTime, { color: colors.textTertiary }]}>Just now</Text>
                <View style={styles.previewAnonBadge}>
                  <Feather name="eye-off" size={10} color={colors.textTertiary} />
                  <Text style={[styles.previewAnonLabel, { color: colors.textTertiary }]}>anon</Text>
                </View>
              </View>

              <Text style={[styles.previewContent, { color: colors.text }]}>{content.trim()}</Text>

              {selectedImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 12 }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {selectedImages.map((img, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: img.uri }}
                      style={styles.previewImage}
                      contentFit="cover"
                    />
                  ))}
                </ScrollView>
              )}

              {selectedVideo && !selectedImages.length && (
                <View style={[styles.previewVideoThumb, { backgroundColor: colors.background }]}>
                  <Feather name="play-circle" size={40} color={colors.textSecondary} />
                  <Text style={[styles.previewVideoLabel, { color: colors.textSecondary }]}>
                    Video · {Math.round(selectedVideo.duration ?? 0)}s
                  </Text>
                </View>
              )}

              <View style={[styles.previewFooter, { borderTopColor: colors.border }]}>
                <View style={styles.previewStat}>
                  <Feather name="thumbs-up" size={14} color={colors.textTertiary} />
                  <Text style={[styles.previewStatText, { color: colors.textTertiary }]}>Worth it</Text>
                </View>
                <View style={styles.previewStat}>
                  <Feather name="thumbs-down" size={14} color={colors.textTertiary} />
                  <Text style={[styles.previewStatText, { color: colors.textTertiary }]}>Skip</Text>
                </View>
                <View style={styles.previewStat}>
                  <Feather name="message-circle" size={14} color={colors.textTertiary} />
                  <Text style={[styles.previewStatText, { color: colors.textTertiary }]}>Comment</Text>
                </View>
                {expiresInHours !== null && (
                  <View style={styles.previewStat}>
                    <Feather name="clock" size={12} color={colors.textTertiary} />
                    <Text style={[styles.previewStatText, { color: colors.textTertiary }]}>
                      Deletes in {EXPIRY_OPTIONS.find((o) => o.value === expiresInHours)?.label}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.previewActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.previewEditBtn, { borderColor: colors.border }]}
              onPress={() => setShowPreview(false)}
            >
              <Feather name="edit-2" size={16} color={colors.text} />
              <Text style={[styles.previewEditText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewPostBtn, { backgroundColor: colors.green }]}
              onPress={() => {
                setShowPreview(false);
                handleSubmit(false);
              }}
              disabled={posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#000" />
                  <Text style={styles.previewPostText}>Post anonymously</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    rateLimitBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255,159,10,0.12)",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,159,10,0.2)",
    },
    rateLimitText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "#FF9F0A",
    },
    mediaRow: {
      marginTop: 12,
      flexDirection: "row",
    },
    mediaThumbnailWrap: {
      position: "relative",
    },
    mediaThumbnail: {
      width: 90,
      height: 90,
      borderRadius: 10,
    },
    videoThumb: {
      backgroundColor: "#1C1C1E",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
    },
    videoDuration: {
      color: "#fff",
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    removeThumb: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(0,0,0,0.65)",
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
    scheduledBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 10,
      borderRadius: 10,
      marginTop: 10,
    },
    scheduledBannerText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    scheduleSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 8,
      marginTop: -4,
    },
    schedulePreset: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 3,
    },
    schedulePresetText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.text,
    },
    scheduleDivider: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginVertical: 10,
    },
    scheduleDividerLine: {
      flex: 1,
      height: 1,
    },
    scheduleDividerText: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
    },
    scheduleRemoveBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      justifyContent: "center",
      paddingVertical: 10,
      marginTop: 4,
    },
    scheduleRemoveBtnText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "#FF3B30",
    },
    scheduledInfoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      width: "100%",
    },
    scheduledInfoText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 20,
    },
    previewScreen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    previewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    previewHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.greenDim,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewHintText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.green,
    },
    previewCard: {
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    previewCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    previewAvatarDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    previewUserId: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    previewDot: {
      fontSize: 13,
    },
    previewTime: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    previewAnonBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    previewAnonLabel: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
    },
    previewContent: {
      fontSize: 17,
      fontFamily: "Inter_400Regular",
      lineHeight: 26,
    },
    previewImage: {
      width: 200,
      height: 200,
      borderRadius: 12,
    },
    previewVideoThumb: {
      marginTop: 12,
      height: 140,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },
    previewVideoLabel: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
    previewFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      flexWrap: "wrap",
    },
    previewStat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    previewStatText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
    previewActions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
    },
    previewEditBtn: {
      flex: 1,
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    previewEditText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    previewPostBtn: {
      flex: 2,
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
    },
    previewPostText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#000",
    },
  });
}
