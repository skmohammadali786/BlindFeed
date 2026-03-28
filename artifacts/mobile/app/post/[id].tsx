import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { timeAgo } from "@/utils/time";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts, reactions, reactToPost } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [copied, setCopied] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);

  const post = posts.find((p) => p.id === id);
  const reaction = post ? reactions[post.id] : undefined;

  const handleReact = (type: "worthit" | "skip") => {
    if (!post || reaction) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    reactToPost(post.id, type);
  };

  const handleCopy = async () => {
    if (!post) return;
    await Clipboard.setStringAsync(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <TouchableOpacity style={[styles.backBtn, { marginLeft: 16, marginTop: 8 }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={40} color={Colors.textTertiary} />
          <Text style={styles.notFoundText}>Post not found</Text>
          <Text style={styles.notFoundSub}>It may have expired (48h limit)</Text>
        </View>
      </View>
    );
  }

  const myWorthIt = reaction === "worthit";
  const mySkip = reaction === "skip";
  const total = post.worthItCount + post.skipCount;
  const worthItPct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => setShowReportMenu(!showReportMenu)}
        >
          <Feather name="more-horizontal" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Report menu */}
      {showReportMenu && (
        <View style={styles.reportMenu}>
          <TouchableOpacity
            style={styles.reportMenuItem}
            onPress={() => {
              setShowReportMenu(false);
              router.push({ pathname: "/report", params: { postId: post.id } });
            }}
          >
            <Feather name="flag" size={15} color="#FF453A" />
            <Text style={styles.reportMenuText}>Report post</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reportMenuItem}
            onPress={() => {
              setShowReportMenu(false);
              handleCopy();
            }}
          >
            <Feather name="copy" size={15} color={Colors.textSecondary} />
            <Text style={[styles.reportMenuText, { color: Colors.textSecondary }]}>
              {copied ? "Copied!" : "Copy text"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.postText}>{post.content}</Text>

        <View style={styles.meta}>
          <Feather name="clock" size={13} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{timeAgo(post.createdAt)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Feather name="eye-off" size={13} color={Colors.textTertiary} />
          <Text style={styles.metaText}>Anonymous</Text>
        </View>

        {total > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Worth it</Text>
              <Text style={styles.statsValue}>{worthItPct}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${worthItPct}%` as any }]} />
            </View>
            <View style={styles.statsRow}>
              <Text style={[styles.statsLabel, { color: Colors.textTertiary }]}>
                {post.worthItCount} worth it · {post.skipCount} skip · {total} total
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reaction buttons pinned to bottom */}
      <View style={[styles.actionBar, { paddingBottom: bottom + 12 }]}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.worthItBtn,
            myWorthIt && styles.worthItBtnActive,
            !!reaction && !myWorthIt && styles.dimmedBtn,
          ]}
          onPress={() => handleReact("worthit")}
          disabled={!!reaction}
          activeOpacity={0.8}
        >
          <Feather
            name="check"
            size={18}
            color={myWorthIt ? "#000" : reaction ? Colors.textTertiary : Colors.green}
          />
          <Text
            style={[
              styles.actionBtnText,
              myWorthIt && styles.worthItBtnTextActive,
              !!reaction && !myWorthIt && styles.dimmedText,
            ]}
          >
            Worth it
          </Text>
          <Text
            style={[
              styles.actionCount,
              myWorthIt && styles.worthItBtnTextActive,
              !!reaction && !myWorthIt && styles.dimmedText,
            ]}
          >
            {post.worthItCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.skipBtn,
            mySkip && styles.skipBtnActive,
            !!reaction && !mySkip && styles.dimmedBtn,
          ]}
          onPress={() => handleReact("skip")}
          disabled={!!reaction}
          activeOpacity={0.8}
        >
          <Feather
            name="x"
            size={18}
            color={mySkip ? "#fff" : reaction ? Colors.textTertiary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.actionBtnText,
              mySkip && styles.skipBtnTextActive,
              !!reaction && !mySkip && styles.dimmedText,
            ]}
          >
            Skip
          </Text>
          <Text
            style={[
              styles.actionCount,
              mySkip && styles.skipBtnTextActive,
              !!reaction && !mySkip && styles.dimmedText,
            ]}
          >
            {post.skipCount}
          </Text>
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  moreBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  reportMenu: {
    position: "absolute",
    top: 80,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 100,
    overflow: "hidden",
  },
  reportMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reportMenuText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#FF453A",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  postText: {
    fontSize: 22,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 34,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  metaDot: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  statsValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.green,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.green,
    borderRadius: 3,
  },
  actionBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 14,
  },
  worthItBtn: {
    backgroundColor: Colors.greenDim,
    borderWidth: 1.5,
    borderColor: Colors.green,
  },
  worthItBtnActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  skipBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  skipBtnActive: {
    backgroundColor: "rgba(255,69,58,0.15)",
    borderColor: "#FF453A",
  },
  dimmedBtn: {
    opacity: 0.4,
  },
  actionBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.green,
  },
  worthItBtnTextActive: {
    color: "#000",
  },
  skipBtnTextActive: {
    color: "#FF453A",
  },
  dimmedText: {
    color: Colors.textTertiary,
  },
  actionCount: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.green,
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
    color: Colors.textSecondary,
  },
  notFoundSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
});
