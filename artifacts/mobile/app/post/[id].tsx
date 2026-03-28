import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { api, ApiComment, getObjectUrl } from "@/utils/api";
import { timeAgo } from "@/utils/time";
import {
  ScreenTransition,
  FadeSlide,
  AnimatedListItem,
  AnimatedPressable,
  useReactionAnim,
} from "@/components/Animations";
import Animated from "react-native-reanimated";

function parseImageUrls(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith("[")) {
    try { return JSON.parse(imageUrl); } catch { return [imageUrl]; }
  }
  return [imageUrl];
}

function hashColor(str: string): string {
  const palette = ["#3DDB85", "#4ECDC4", "#FFE66D", "#F7AEF8", "#B8F0E6", "#FFB347", "#A8DADC", "#E9C46A"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function CommentAvatar({ anonymousId, size = 30 }: { anonymousId: string; size?: number }) {
  const bg = hashColor(anonymousId);
  const initials = (anonymousId.slice(0, 2) || "??").toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: size * 0.36, fontFamily: "Inter_700Bold", color: "#000" }}>{initials}</Text>
    </View>
  );
}

function ReactionBtn({
  active, activeColor, icon, label, count, onPress, colors,
}: {
  active: boolean; activeColor: string; icon: string; label: string;
  count: number; onPress: () => void; colors: ReturnType<typeof useTheme>["colors"];
}) {
  const { style: animStyle, trigger } = useReactionAnim();
  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <TouchableOpacity
        style={[
          reactionStyles.btn,
          {
            borderColor: active ? activeColor : colors.border,
            backgroundColor: active ? activeColor : colors.surface,
          },
        ]}
        onPress={() => { trigger(); onPress(); }}
        activeOpacity={0.8}
      >
        <View style={[reactionStyles.iconCircle, { backgroundColor: active ? "rgba(255,255,255,0.22)" : `${activeColor}18` }]}>
          <Feather name={icon as any} size={16} color={active ? "#fff" : activeColor} />
        </View>
        <View style={reactionStyles.btnLabels}>
          <Text style={[reactionStyles.label, { color: active ? "#fff" : colors.text }]}>{label}</Text>
          <Text style={[reactionStyles.count, { color: active ? "rgba(255,255,255,0.75)" : colors.textSecondary }]}>{count} votes</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const reactionStyles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  btnLabels: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  count: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { posts, reactToPost } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  useTick(30_000);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ApiComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [remotePost, setRemotePost] = useState<import("@/context/AppContext").Post | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  const localPost = posts.find((p) => p.id === id);
  const post = localPost ?? remotePost;
  const reaction = post?.myReaction ?? null;

  useEffect(() => {
    if (!localPost && id) {
      setPostLoading(true);
      api.get<import("@/utils/api").ApiPost>(`/posts/${id}`)
        .then((data) => {
          setRemotePost({
            id: String(data.id),
            content: data.content,
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            createdAt: new Date(data.createdAt).getTime(),
            expiresAt: new Date(data.expiresAt).getTime(),
            worthItCount: data.worthItCount,
            skipCount: data.skipCount,
            tempUserId: data.anonymousId,
            myReaction: data.myReaction,
            commentCount: data.commentCount,
            isOwn: data.isOwn,
          });
        })
        .catch(() => {})
        .finally(() => setPostLoading(false));
    }
  }, [id, localPost]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const data = await api.get<ApiComment[]>(`/posts/${id}/comments`);
      setComments(data);
    } catch (_) {}
    finally { setCommentsLoading(false); }
  }, [id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleReact = (type: "worthit" | "skip") => {
    if (!post) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reactToPost(post.id, type);
  };

  const handleCopy = async () => {
    if (!post) return;
    await Clipboard.setStringAsync(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setCommentError(null);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const body: { content: string; parentId?: number } = { content: text };
      if (replyingTo) body.parentId = replyingTo.id;
      await api.post(`/posts/${id}/comments`, body);
      setCommentText("");
      setReplyingTo(null);
      await fetchComments();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (_) {
      setCommentError("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDeleteCommentId(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!deleteCommentId || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/comments/${deleteCommentId}`);
      setDeleteCommentId(null);
      await fetchComments();
    } catch {
      setDeleteCommentId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleReply = (comment: ApiComment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const styles = makeStyles(colors);

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <TouchableOpacity style={styles.backBtnStandalone} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        {postLoading ? (
          <View style={styles.notFound}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : (
          <View style={styles.notFound}>
            <Feather name="alert-circle" size={40} color={colors.textTertiary} />
            <Text style={styles.notFoundText}>Post not found</Text>
            <Text style={styles.notFoundSub}>It may have expired or been deleted</Text>
          </View>
        )}
      </View>
    );
  }

  const total = post.worthItCount + post.skipCount;
  const worthPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;
  const myWorthIt = reaction === "worthit";
  const mySkip = reaction === "skip";

  type ListItem =
    | { type: "header" }
    | { type: "comment"; data: ApiComment }
    | { type: "reply"; data: ApiComment; parent: ApiComment };

  const allItems: ListItem[] = [
    { type: "header" },
    ...comments.flatMap((c) => [
      { type: "comment" as const, data: c },
      ...c.replies.map((r) => ({ type: "reply" as const, data: r, parent: c })),
    ]),
  ];

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === "header") {
      return (
        <View style={styles.postSection}>
          <View style={styles.postTopBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.postDetailLabel}>Post detail</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
                <Feather name={copied ? "check" : "copy"} size={16} color={copied ? colors.green : colors.textSecondary} />
                {copied && <Text style={styles.copiedLabel}>Copied</Text>}
              </TouchableOpacity>
              {!post.isOwn && (
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => router.push({ pathname: "/report", params: { postId: post.id } } as any)}
                >
                  <Feather name="flag" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(() => {
            const imgs = parseImageUrls(post.imageUrl);
            if (imgs.length === 0) return null;
            if (imgs.length === 1) {
              return <Image source={{ uri: getObjectUrl(imgs[0]) }} style={styles.postImage} contentFit="cover" />;
            }
            return (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                {imgs.map((url, i) => (
                  <Image key={i} source={{ uri: getObjectUrl(url) }} style={styles.multiImage} contentFit="cover" />
                ))}
              </ScrollView>
            );
          })()}

          {post.videoUrl && (
            <View style={styles.videoContainer}>
              <Feather name="play-circle" size={40} color="#fff" />
              <Text style={styles.videoNote}>Video attached — open in app to play</Text>
            </View>
          )}

          <Text style={styles.postContent}>{post.content}</Text>

          <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>

          <View style={styles.statsRow}>
            {[
              { value: post.worthItCount, label: "Worth it", color: colors.green },
              { value: post.skipCount, label: "Skip", color: "#FF3B30" },
              { value: `${worthPct}%`, label: "Positive", color: colors.text },
              { value: comments.length, label: "Comments", color: colors.text },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {total > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${worthPct}%` as `${number}%` }]} />
            </View>
          )}

          <View style={styles.commentsHeaderRow}>
            <Text style={styles.commentsHeader}>Comments</Text>
            {commentsLoading && <ActivityIndicator size="small" color={colors.green} />}
          </View>

          {!commentsLoading && comments.length === 0 && (
            <View style={styles.noCommentsRow}>
              <Feather name="message-circle" size={20} color={colors.textTertiary} />
              <Text style={styles.noComments}>Be the first to comment</Text>
            </View>
          )}
        </View>
      );
    }

    const isReply = item.type === "reply";
    const comment = item.data;
    const avatarColor = hashColor(comment.anonymousId);

    return (
      <AnimatedListItem index={index}>
        <View style={[styles.commentRow, isReply && styles.replyRow]}>
          {isReply && <View style={[styles.replyThreadLine, { backgroundColor: avatarColor + "55" }]} />}
          <CommentAvatar anonymousId={comment.anonymousId} size={isReply ? 26 : 32} />
          <View style={styles.commentBubble}>
            <View style={styles.commentMeta}>
              <Text style={styles.commentUserId} numberOfLines={1}>
                {comment.isOwn ? "You" : comment.anonymousId}
              </Text>
              <Text style={styles.commentDot}>·</Text>
              <Text style={styles.commentTime}>{timeAgo(new Date(comment.createdAt).getTime())}</Text>
              <View style={{ flex: 1 }} />
              {!isReply && (
                <TouchableOpacity onPress={() => handleReply(comment)} style={styles.replyBtn}>
                  <Feather name="corner-down-right" size={12} color={colors.textSecondary} />
                  <Text style={styles.replyBtnText}>Reply</Text>
                </TouchableOpacity>
              )}
              {comment.isOwn && (
                <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={13} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.commentText, comment.isOwn && styles.commentTextOwn]}>{comment.content}</Text>
          </View>
        </View>
      </AnimatedListItem>
    );
  };

  return (
    <ScreenTransition>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={allItems}
          keyExtractor={(item, i) =>
            item.type === "header" ? "header" :
            item.type === "reply" ? `reply-${item.data.id}` :
            `comment-${item.data.id}-${i}`
          }
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        />

        <Modal
          visible={deleteCommentId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteCommentId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Delete comment?</Text>
              <Text style={styles.modalBody}>This action cannot be undone.</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setDeleteCommentId(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirm, { backgroundColor: "#FF3B30" }]}
                  onPress={confirmDeleteComment}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalConfirmText, { color: "#fff" }]}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={[styles.footer, { paddingBottom: bottom || 12 }]}>
          {post.isOwn ? (
            <TouchableOpacity
              style={styles.managePostBtn}
              onPress={() => { router.back(); router.push("/my-posts"); }}
              activeOpacity={0.8}
            >
              <Feather name="layers" size={16} color={colors.green} />
              <Text style={styles.managePostText}>Manage this post in My Posts</Text>
              <Feather name="arrow-right" size={16} color={colors.green} />
            </TouchableOpacity>
          ) : (
            <View style={styles.reactionRow}>
              <ReactionBtn
                active={myWorthIt}
                activeColor={colors.green}
                icon="check"
                label="Worth it"
                count={post.worthItCount}
                onPress={() => handleReact("worthit")}
                colors={colors}
              />
              <ReactionBtn
                active={mySkip}
                activeColor="#FF3B30"
                icon="x"
                label="Skip"
                count={post.skipCount}
                onPress={() => handleReact("skip")}
                colors={colors}
              />
            </View>
          )}

          <View style={styles.footerDivider} />

          {replyingTo && (
            <View style={styles.replyingToBar}>
              <Feather name="corner-down-right" size={13} color={colors.green} />
              <Text style={styles.replyingToText} numberOfLines={1}>
                Replying: "{replyingTo.content.slice(0, 60)}{replyingTo.content.length > 60 ? "…" : ""}"
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.cancelReplyBtn}>
                <Feather name="x" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {commentError && (
            <View style={styles.commentErrorRow}>
              <Feather name="alert-circle" size={13} color="#FF3B30" />
              <Text style={styles.commentErrorText}>{commentError}</Text>
              <TouchableOpacity onPress={() => setCommentError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={13} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={commentText}
              onChangeText={(t) => { setCommentText(t); if (commentError) setCommentError(null); }}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={300}
              returnKeyType="default"
            />
            <AnimatedPressable
              scaleTo={0.88}
              onPress={handleSubmitComment}
              style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Feather name="send" size={16} color={commentText.trim() ? "#000" : colors.textTertiary} />
              )}
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    backBtnStandalone: { margin: 16, padding: 4 },

    postSection: { paddingHorizontal: 16, paddingBottom: 8 },
    postTopBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      marginBottom: 4,
    },
    backBtn: { padding: 4, marginRight: 8 },
    postDetailLabel: {
      flex: 1,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: 5, padding: 4 },
    copiedLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.green },

    postImage: { width: "100%", height: 220, borderRadius: 14, marginBottom: 14 },
    multiImage: { width: 200, height: 200, borderRadius: 12 },
    videoContainer: {
      backgroundColor: "#1C1C1E",
      borderRadius: 14,
      height: 140,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
      gap: 8,
    },
    videoNote: { color: "#8E8E93", fontSize: 13, fontFamily: "Inter_400Regular" },
    postContent: {
      fontSize: 20,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 30,
      letterSpacing: -0.2,
      marginBottom: 12,
    },
    postTime: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: 14 },

    statsRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      alignItems: "center",
    },
    statItem: { flex: 1, alignItems: "center", gap: 3 },
    statValue: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    statDivider: { width: 1, height: 30, backgroundColor: colors.border },

    progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden", marginBottom: 16 },
    progressFill: { height: 4, backgroundColor: colors.green },

    commentsHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, marginBottom: 8 },
    commentsHeader: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.text },
    noCommentsRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
    noComments: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary },

    commentRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    replyRow: {
      paddingLeft: 36,
      gap: 8,
    },
    replyThreadLine: {
      width: 2,
      alignSelf: "stretch",
      borderRadius: 1,
      minHeight: 20,
      marginTop: 4,
    },
    commentBubble: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      gap: 6,
    },
    commentMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
    commentUserId: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.green,
      flexShrink: 1,
    },
    commentDot: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    commentTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    replyBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
    replyBtnText: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textSecondary },
    deleteBtn: { padding: 2 },
    commentText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.text, lineHeight: 20 },
    commentTextOwn: { color: colors.text },

    footer: {
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
      paddingHorizontal: 12,
      gap: 8,
    },
    reactionRow: { flexDirection: "row", gap: 10 },
    managePostBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.greenDim,
      borderRadius: 14,
      paddingVertical: 14,
    },
    managePostText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.green, flex: 1, textAlign: "center" },
    footerDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: -12 },

    replyingToBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.greenDim,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    replyingToText: {
      flex: 1,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.text,
    },
    cancelReplyBtn: { padding: 2 },

    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 2 },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      maxHeight: 90,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.green,
      justifyContent: "center",
      alignItems: "center",
    },
    sendBtnDisabled: { backgroundColor: colors.surface },

    commentErrorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: "rgba(255,59,48,0.08)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    commentErrorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: "#FF3B30",
    },

    notFound: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
    notFoundText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.text },
    notFoundSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary },

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
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    modalConfirmText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
