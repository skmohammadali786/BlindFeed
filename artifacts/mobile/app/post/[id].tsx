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
import { api, ApiComment, getObjectUrl } from "@/utils/api";
import { timeAgo } from "@/utils/time";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { posts, reactToPost } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ApiComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const post = posts.find((p) => p.id === id);
  const reaction = post?.myReaction ?? null;

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
    try {
      const body: { content: string; parentId?: number } = { content: text };
      if (replyingTo) body.parentId = replyingTo.id;
      await api.post(`/posts/${id}/comments`, body);
      setCommentText("");
      setReplyingTo(null);
      await fetchComments();
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  const handleReply = (comment: ApiComment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText("");
  };

  const styles = makeStyles(colors);

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={40} color={colors.textTertiary} />
          <Text style={styles.notFoundText}>Post not found</Text>
          <Text style={styles.notFoundSub}>It may have expired (48h limit)</Text>
        </View>
      </View>
    );
  }

  const total = post.worthItCount + post.skipCount;
  const worthPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;
  const myWorthIt = reaction === "worthit";
  const mySkip = reaction === "skip";

  const allItems: Array<{ type: "header" } | { type: "comment"; data: ApiComment } | { type: "reply"; data: ApiComment; parentId: number }> = [
    { type: "header" },
    ...comments.flatMap((c) => [
      { type: "comment" as const, data: c },
      ...c.replies.map((r) => ({ type: "reply" as const, data: r, parentId: c.id })),
    ]),
  ];

  const renderItem = ({ item }: { item: typeof allItems[number] }) => {
    if (item.type === "header") {
      return (
        <View style={styles.postSection}>
          <View style={styles.postHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
              <Feather name="copy" size={16} color={colors.textSecondary} />
              {copied && <Text style={styles.copiedLabel}>Copied</Text>}
            </TouchableOpacity>
          </View>

          {post.imageUrl && (
            <Image
              source={{ uri: getObjectUrl(post.imageUrl) }}
              style={styles.postImage}
              contentFit="cover"
            />
          )}

          <Text style={styles.postContent}>{post.content}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
            <Text style={styles.postExpiry}>
              Expires {timeAgo(post.expiresAt)}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{post.worthItCount}</Text>
              <Text style={styles.statLabel}>Worth it</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{post.skipCount}</Text>
              <Text style={styles.statLabel}>Skip</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{worthPct}%</Text>
              <Text style={styles.statLabel}>Positive</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{comments.length}</Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
          </View>

          {total > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${worthPct}%` as `${number}%` }]} />
            </View>
          )}

          <Text style={styles.commentsHeader}>Comments</Text>

          {commentsLoading && (
            <ActivityIndicator size="small" color={colors.green} style={{ marginVertical: 16 }} />
          )}
          {!commentsLoading && comments.length === 0 && (
            <Text style={styles.noComments}>Be the first to comment</Text>
          )}
        </View>
      );
    }

    const isReply = item.type === "reply";
    const comment = item.data;

    return (
      <View style={[styles.commentItem, isReply && styles.replyItem]}>
        {isReply && <View style={styles.replyLine} />}
        <View style={styles.commentContent}>
          <Text style={styles.commentText}>{comment.content}</Text>
          <View style={styles.commentMeta}>
            <Text style={styles.commentTime}>{timeAgo(new Date(comment.createdAt).getTime())}</Text>
            {!isReply && (
              <TouchableOpacity onPress={() => handleReply(comment)} style={styles.replyBtn}>
                <Feather name="corner-down-right" size={13} color={colors.textSecondary} />
                <Text style={styles.replyBtnText}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <FlatList
        data={allItems}
        keyExtractor={(item, i) =>
          item.type === "header" ? "header" :
          item.type === "reply" ? `reply-${item.data.id}` :
          `comment-${item.data.id}-${i}`
        }
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: bottom + 80 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Pinned reaction buttons */}
      <View style={[styles.reactionBar, { paddingBottom: bottom + 64 }]}>
        <TouchableOpacity
          style={[styles.reactionBtn, myWorthIt && styles.reactionBtnActive]}
          onPress={() => handleReact("worthit")}
          activeOpacity={0.8}
        >
          <Feather name="check" size={18} color={myWorthIt ? "#000" : colors.text} />
          <Text style={[styles.reactionBtnText, myWorthIt && styles.reactionBtnTextActive]}>Worth it</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reactionBtn, styles.reactionBtnSkip, mySkip && styles.reactionBtnSkipActive]}
          onPress={() => handleReact("skip")}
          activeOpacity={0.8}
        >
          <Feather name="x" size={18} color={mySkip ? "#fff" : colors.textSecondary} />
          <Text style={[styles.reactionBtnText, mySkip && styles.reactionBtnSkipText]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Comment input */}
      <View style={[styles.commentInputBar, { paddingBottom: bottom || 8 }]}>
        {replyingTo && (
          <View style={styles.replyingToBar}>
            <Text style={styles.replyingToText}>Replying to comment</Text>
            <TouchableOpacity onPress={cancelReply}>
              <Feather name="x" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.commentInputRow}>
          <TextInput
            ref={inputRef}
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Feather name="send" size={16} color={commentText.trim() ? "#000" : colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    postSection: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    postHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      marginBottom: 8,
    },
    backBtn: {
      padding: 4,
    },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: 4,
    },
    copiedLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.green,
    },
    postImage: {
      width: "100%",
      height: 220,
      borderRadius: 14,
      marginBottom: 16,
    },
    postContent: {
      fontSize: 22,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 32,
      letterSpacing: -0.3,
      marginBottom: 16,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    postTime: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    postExpiry: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    statsRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginHorizontal: 4,
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: "hidden",
      marginBottom: 20,
    },
    progressFill: {
      height: 4,
      backgroundColor: colors.green,
    },
    commentsHeader: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
      marginTop: 4,
      marginBottom: 12,
    },
    noComments: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: 16,
    },
    commentItem: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    replyItem: {
      paddingLeft: 40,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    replyLine: {
      width: 2,
      backgroundColor: colors.border,
      borderRadius: 1,
      marginRight: 12,
      alignSelf: "stretch",
      minHeight: 30,
    },
    commentContent: {
      flex: 1,
      gap: 6,
    },
    commentText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 22,
    },
    commentMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    commentTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    replyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    replyBtnText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    reactionBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    reactionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
    },
    reactionBtnActive: {
      backgroundColor: colors.green,
    },
    reactionBtnSkip: {
      backgroundColor: colors.surface,
    },
    reactionBtnSkipActive: {
      backgroundColor: "#FF3B30",
    },
    reactionBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    reactionBtnTextActive: {
      color: "#000",
    },
    reactionBtnSkipText: {
      color: "#fff",
    },
    notFound: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
    },
    notFoundText: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    notFoundSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    commentInputBar: {
      position: "absolute",
      bottom: 58,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    replyingToBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 6,
    },
    replyingToText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    commentInputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    commentInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      maxHeight: 100,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.green,
      justifyContent: "center",
      alignItems: "center",
    },
    sendBtnDisabled: {
      backgroundColor: colors.surface,
    },
  });
}
