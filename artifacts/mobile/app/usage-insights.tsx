import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { ScreenTransition, FadeSlide, AnimatedListItem, AnimatedPressable } from "@/components/Animations";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function UsageInsightsScreen() {
  const { colors } = useTheme();
  const { getMyPosts, posts, sessionSeconds } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const myPosts = getMyPosts();
  const reactedPosts = posts.filter((p) => p.myReaction !== null);
  const reactionCount = reactedPosts.length;
  const worthItCount = reactedPosts.filter((p) => p.myReaction === "worthit").length;
  const skipCount = reactedPosts.filter((p) => p.myReaction === "skip").length;
  const totalReactions = worthItCount + skipCount;
  const worthItPct = totalReactions > 0 ? Math.round((worthItCount / totalReactions) * 100) : 0;
  const timeStr = formatTime(sessionSeconds);

  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Usage Insights</Text>
            <View style={{ width: 38 }} />
          </View>
        </FadeSlide>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FadeSlide delay={60}><Text style={styles.sectionTitle}>Your Activity</Text></FadeSlide>

          <AnimatedListItem index={0}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Feather name="edit-3" size={20} color={colors.green} />
                <Text style={[styles.statValue, { color: colors.green }]}>{String(myPosts.length)}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statCard}>
                <Feather name="zap" size={20} color="#FFD60A" />
                <Text style={[styles.statValue, { color: "#FFD60A" }]}>{String(reactionCount)}</Text>
                <Text style={styles.statLabel}>Reactions</Text>
              </View>
              <View style={styles.statCard}>
                <Feather name="clock" size={20} color={colors.textSecondary} />
                <Text style={styles.statValue}>{timeStr}</Text>
                <Text style={styles.statLabel}>This session</Text>
              </View>
            </View>
          </AnimatedListItem>

        {reactionCount > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Reactions</Text>
            <View style={styles.reactionRow}>
              <View style={styles.reactionItem}>
                <Feather name="check" size={16} color={colors.green} />
                <Text style={styles.reactionCount}>{worthItCount}</Text>
                <Text style={styles.reactionLabel}>Worth it</Text>
              </View>
              <View style={styles.reactionDivider} />
              <View style={styles.reactionItem}>
                <Feather name="x" size={16} color="#FF453A" />
                <Text style={styles.reactionCount}>{skipCount}</Text>
                <Text style={styles.reactionLabel}>Skip</Text>
              </View>
            </View>
            {totalReactions > 0 && (
              <>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${worthItPct}%` as `${number}%` }]} />
                </View>
                <Text style={styles.progressLabel}>{worthItPct}% Worth it</Text>
              </>
            )}
          </View>
        )}

        {myPosts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Posts</Text>
            {myPosts.map((post) => {
              const total = post.worthItCount + post.skipCount;
              const pct = total > 0 ? Math.round((post.worthItCount / total) * 100) : 0;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.postItemText} numberOfLines={2}>{post.content}</Text>
                  <View style={styles.postItemMeta}>
                    <View style={styles.postItemStat}>
                      <Feather name="check" size={12} color={colors.green} />
                      <Text style={styles.postItemStatText}>{post.worthItCount}</Text>
                    </View>
                    <View style={styles.postItemStat}>
                      <Feather name="x" size={12} color={colors.textTertiary} />
                      <Text style={styles.postItemStatText}>{post.skipCount}</Text>
                    </View>
                    {total > 0 && <Text style={styles.postItemPct}>{pct}% worth it</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {myPosts.length === 0 && reactionCount === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySub}>Post something or react to see your stats here</Text>
            <TouchableOpacity style={styles.postBtn} onPress={() => router.push("/create")} activeOpacity={0.85}>
              <Text style={styles.postBtnText}>Create a post</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.privacyNote}>
          <Feather name="shield" size={14} color={colors.textTertiary} />
          <Text style={styles.privacyText}>Stats are based on your current session activity.</Text>
        </View>
        </ScrollView>
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, gap: 16, paddingTop: 8 },
    sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.text, marginBottom: 4 },
    statsRow: { flexDirection: "row", gap: 10 },
    statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 16, alignItems: "center", gap: 6 },
    statValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.text },
    statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textTertiary, textAlign: "center" },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 12 },
    cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    reactionRow: { flexDirection: "row", alignItems: "center" },
    reactionItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    reactionDivider: { width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 16 },
    reactionCount: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.text },
    reactionLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    progressBar: { height: 6, backgroundColor: colors.surfaceElevated, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: 6, backgroundColor: colors.green, borderRadius: 3 },
    progressLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    postItem: { gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    postItemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.text, lineHeight: 21 },
    postItemMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
    postItemStat: { flexDirection: "row", alignItems: "center", gap: 4 },
    postItemStatText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    postItemPct: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.green, marginLeft: "auto" },
    emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textTertiary, textAlign: "center", lineHeight: 21, paddingHorizontal: 20 },
    postBtn: { marginTop: 8, backgroundColor: colors.green, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
    postBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" },
    privacyNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingTop: 8 },
    privacyText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary, lineHeight: 18 },
  });
}
