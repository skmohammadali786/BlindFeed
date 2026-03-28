import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { api, ApiMyPost } from "@/utils/api";
import { timeAgo } from "@/utils/time";
import { ScreenTransition, FadeSlide, AnimatedListItem, AnimatedPressable } from "@/components/Animations";

const NEVER_THRESHOLD_MS = 365 * 24 * 60 * 60 * 1000;

function expiryLabel(expiresAt: string): { label: string; expired: boolean; isNever: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms > NEVER_THRESHOLD_MS) return { label: "Never expires", expired: false, isNever: true };
  if (ms <= 0) return { label: "Expired", expired: true, isNever: false };
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (h >= 24) return { label: `${Math.floor(h / 24)}d left`, expired: false, isNever: false };
  if (h >= 1) return { label: `${h}h ${m}m left`, expired: false, isNever: false };
  return { label: `${m}m left`, expired: false, isNever: false };
}

const EDIT_WINDOW_MS = 10 * 60 * 1000;

function PostCard({
  post,
  index,
  onDelete,
  onEdit,
  colors,
}: {
  post: ApiMyPost;
  index: number;
  onDelete: (id: number) => void;
  onEdit: (post: ApiMyPost) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const styles = makeCardStyles(colors);
  const { label: expLabel, expired, isNever } = expiryLabel(post.expiresAt);
  const total = post.worthItCount + post.skipCount;
  const worthPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;
  const ageMs = Date.now() - new Date(post.createdAt).getTime();
  const canEdit = !expired && ageMs < EDIT_WINDOW_MS;

  return (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => !expired && router.push(`/post/${post.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.expiryBadge, expired && styles.expiryBadgeExpired, isNever && styles.expiryBadgeNever]}>
            <Feather name={isNever ? "lock" : "clock"} size={11} color={expired ? "#FF3B30" : isNever ? colors.textSecondary : colors.green} />
            <Text style={[styles.expiryText, expired && styles.expiryTextExpired, isNever && styles.expiryTextNever]}>{expLabel}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {canEdit && (
              <AnimatedPressable
                scaleTo={0.88}
                onPress={() => onEdit(post)}
                style={styles.editBtn}
              >
                <Feather name="edit-2" size={14} color={colors.green} />
              </AnimatedPressable>
            )}
            <AnimatedPressable
              scaleTo={0.88}
              onPress={() => onDelete(post.id)}
              style={styles.deleteBtn}
            >
              <Feather name="trash-2" size={15} color="#FF3B30" />
            </AnimatedPressable>
          </View>
        </View>

        <Text style={styles.content} numberOfLines={3}>{post.content}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Feather name="check" size={13} color={colors.green} />
            <Text style={styles.statText}>{post.worthItCount}</Text>
          </View>
          <View style={styles.stat}>
            <Feather name="x" size={13} color="#FF3B30" />
            <Text style={styles.statText}>{post.skipCount}</Text>
          </View>
          {total > 0 && (
            <View style={styles.stat}>
              <Feather name="trending-up" size={13} color={colors.textSecondary} />
              <Text style={styles.statText}>{worthPct}%</Text>
            </View>
          )}
          <View style={styles.stat}>
            <Feather name="message-circle" size={13} color={colors.textSecondary} />
            <Text style={styles.statText}>{post.commentCount}</Text>
          </View>
          <Text style={styles.postTime}>{timeAgo(new Date(post.createdAt).getTime())}</Text>
        </View>

        {total > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${worthPct}%` as `${number}%` }]} />
          </View>
        )}

        {post.latestComment && (
          <View style={styles.latestComment}>
            <View style={styles.latestCommentDot} />
            <View style={styles.latestCommentBody}>
              <Text style={styles.latestCommentLabel}>Latest comment</Text>
              <Text style={styles.latestCommentText} numberOfLines={2}>
                {post.latestComment.content}
              </Text>
              <Text style={styles.latestCommentTime}>
                {timeAgo(new Date(post.latestComment.createdAt).getTime())}
              </Text>
            </View>
          </View>
        )}

        {post.commentCount === 0 && (
          <Text style={styles.noComments}>No comments yet</Text>
        )}

        {!expired && (
          <View style={styles.viewRow}>
            <Text style={styles.viewLabel}>Tap to view comments</Text>
            <Feather name="arrow-right" size={13} color={colors.textTertiary} />
          </View>
        )}
      </TouchableOpacity>
    </AnimatedListItem>
  );
}

export default function MyPostsScreen() {
  const { colors } = useTheme();
  const { fetchMyPosts } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [posts, setPosts] = useState<ApiMyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<ApiMyPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const styles = makeStyles(colors);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchMyPosts();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchMyPosts]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback((postId: number) => {
    setDeleteConfirmId(postId);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmId || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/posts/${deleteConfirmId}`);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPosts((prev) => prev.filter((p) => p.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch {
      setDeleteConfirmId(null);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteConfirmId, deleteLoading]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const handleOpenEdit = useCallback((post: ApiMyPost) => {
    setEditingPost(post);
    setEditContent(post.content);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingPost || editSaving) return;
    const trimmed = editContent.trim();
    if (trimmed.length < 10) { Alert.alert("Too short", "Post must be at least 10 characters."); return; }
    if (trimmed.length > 500) { Alert.alert("Too long", "Post cannot exceed 500 characters."); return; }
    setEditSaving(true);
    try {
      await api.patch(`/posts/${editingPost.id}`, { content: trimmed });
      setPosts((prev) => prev.map((p) => p.id === editingPost.id ? { ...p, content: trimmed } : p));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingPost(null);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update post.");
    } finally {
      setEditSaving(false);
    }
  }, [editingPost, editContent, editSaving]);

  const active = posts.filter((p) => new Date(p.expiresAt).getTime() > Date.now());
  const expired = posts.filter((p) => new Date(p.expiresAt).getTime() <= Date.now());

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Posts</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{active.length} active</Text>
            </View>
          </View>
        </FadeSlide>

        {loading ? (
          <FadeSlide delay={80} style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Loading your posts...</Text>
          </FadeSlide>
        ) : error ? (
          <FadeSlide delay={80} style={styles.center}>
            <Feather name="alert-circle" size={40} color={colors.textTertiary} />
            <Text style={[styles.loadingText, { marginTop: 12 }]}>{error}</Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.green, fontFamily: "Inter_500Medium", fontSize: 15 }}>Try again</Text>
            </TouchableOpacity>
          </FadeSlide>
        ) : (
          <FlatList
            data={[
              ...active,
              ...(expired.length > 0 ? [{ type: "section", label: "Expired" } as any] : []),
              ...expired,
            ]}
            keyExtractor={(item, i) => item.id ? String(item.id) : `section-${i}`}
            renderItem={({ item, index }) => {
              if (item.type === "section") {
                return (
                  <Text style={styles.sectionLabel}>{item.label}</Text>
                );
              }
              return (
                <PostCard
                  post={item as ApiMyPost}
                  index={index}
                  onDelete={handleDelete}
                  onEdit={handleOpenEdit}
                  colors={colors}
                />
              );
            }}
            contentContainerStyle={[styles.list, { paddingBottom: bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <FadeSlide delay={80} style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.greenDim }]}>
                  <Feather name="edit-3" size={32} color={colors.green} />
                </View>
                <Text style={styles.emptyTitle}>Your voice is missing</Text>
                <Text style={styles.emptySub}>Share something on your mind. No name, no face — just your raw thoughts with the world.</Text>
                <AnimatedPressable
                  style={[styles.createBtn, { backgroundColor: colors.green }]}
                  onPress={() => router.push("/create")}
                  scaleTo={0.95}
                >
                  <Feather name="edit-2" size={15} color="#000" />
                  <Text style={[styles.createBtnText, { color: "#000" }]}>Write your first post</Text>
                </AnimatedPressable>
              </FadeSlide>
            }
          />
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          visible={deleteConfirmId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteConfirmId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModal}>
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,59,48,0.1)", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                  <Feather name="trash-2" size={22} color="#FF3B30" />
                </View>
                <Text style={[styles.editModalTitle, { textAlign: "center" }]}>Delete post?</Text>
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 20 }}>
                  This will permanently remove your post from the feed. This action cannot be undone.
                </Text>
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.editCancelBtn} onPress={() => setDeleteConfirmId(null)}>
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editSaveBtn, { backgroundColor: "#FF3B30", opacity: deleteLoading ? 0.6 : 1 }]}
                  onPress={handleConfirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.editSaveText, { color: "#fff" }]}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Modal */}
        <Modal
          visible={editingPost !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingPost(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModal}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit post</Text>
                <Text style={styles.editModalHint}>Editing window: 10 min from posting</Text>
              </View>
              <TextInput
                style={styles.editInput}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                maxLength={500}
                textAlignVertical="top"
                autoFocus
                placeholder="Edit your post..."
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={styles.editCharCount}>{editContent.length}/500</Text>
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditingPost(null)}>
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editSaveBtn, editSaving && { opacity: 0.6 }]}
                  onPress={handleSaveEdit}
                  disabled={editSaving}
                >
                  {editSaving ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.editSaveText}>Save changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenTransition>
  );
}

function makeCardStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      gap: 10,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    expiryBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.greenDim,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    expiryBadgeExpired: {
      backgroundColor: "rgba(255,59,48,0.12)",
    },
    expiryBadgeNever: {
      backgroundColor: colors.surface,
    },
    expiryText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
    },
    expiryTextExpired: {
      color: "#FF3B30",
    },
    expiryTextNever: {
      color: colors.textSecondary,
    },
    content: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 22,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    stat: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    postTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      marginLeft: "auto" as any,
    },
    progressBar: {
      height: 3,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: 3,
      backgroundColor: colors.green,
      borderRadius: 2,
    },
    latestComment: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 10,
    },
    latestCommentDot: {
      width: 3,
      backgroundColor: colors.green,
      borderRadius: 2,
      alignSelf: "stretch",
    },
    latestCommentBody: {
      flex: 1,
      gap: 3,
    },
    latestCommentLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    latestCommentText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 18,
    },
    latestCommentTime: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    noComments: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    viewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    viewLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    editBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.greenDim,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(255,59,48,0.1)",
      justifyContent: "center",
      alignItems: "center",
    },
  });
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
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
      flex: 1,
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: -0.3,
    },
    countBadge: {
      backgroundColor: colors.greenDim,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    countText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
    },
    list: { paddingTop: 8 },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginLeft: 16,
      marginBottom: 8,
      marginTop: 16,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    empty: {
      paddingTop: 80,
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 40,
    },
    emptyIconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", marginBottom: 4 },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      textAlign: "center",
    },
    emptySub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 21,
    },
    createBtn: {
      marginTop: 12,
      paddingHorizontal: 28,
      paddingVertical: 14,
      backgroundColor: colors.green,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    createBtnText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: "#000",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    editModal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      gap: 12,
      paddingBottom: 34,
    },
    editModalHeader: { gap: 2 },
    editModalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text },
    editModalHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    editInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      minHeight: 120,
      textAlignVertical: "top",
    },
    editCharCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textTertiary, textAlign: "right" },
    editActions: { flexDirection: "row", gap: 10 },
    editCancelBtn: {
      flex: 1, borderRadius: 14, paddingVertical: 14,
      backgroundColor: colors.surface, alignItems: "center",
    },
    editCancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.textSecondary },
    editSaveBtn: {
      flex: 2, borderRadius: 14, paddingVertical: 14,
      backgroundColor: colors.green, alignItems: "center",
    },
    editSaveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" },
  });
}
