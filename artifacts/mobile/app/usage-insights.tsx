import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { api, ApiMyPost } from "@/utils/api";
import { ScreenTransition, FadeSlide, AnimatedListItem } from "@/components/Animations";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function calcStreak(posts: Array<{ createdAt: string }>): number {
  if (posts.length === 0) return 0;
  const days = new Set(posts.map((p) => dayKey(new Date(p.createdAt))));
  const today = new Date();
  const todayK = dayKey(today);
  const yest = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yestK = dayKey(yest);

  let start = days.has(todayK) ? today : days.has(yestK) ? yest : null;
  if (!start) return 0;

  let streak = 0;
  let cur = new Date(start);
  while (days.has(dayKey(cur))) {
    streak++;
    cur = new Date(cur.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}

type PostSort = "recent" | "top" | "comments";

function scorePost(p: ApiMyPost): number {
  const total = p.worthItCount + p.skipCount;
  return total > 0 ? Math.round((p.worthItCount / total) * 100) : -1;
}

export default function UsageInsightsScreen() {
  const { colors } = useTheme();
  const { posts, totalScreenTimeSeconds } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [allPosts, setAllPosts] = useState<ApiMyPost[]>([]);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [postSort, setPostSort] = useState<PostSort>("recent");

  const loadPosts = async () => {
    try {
      const data = await api.get<ApiMyPost[]>("/posts/mine");
      setAllPosts(data);
      setStreak(calcStreak(data));
    } catch (_) {}
  };

  useEffect(() => { loadPosts(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const reactedPosts = posts.filter((p) => p.myReaction !== null);
  const reactionCount = reactedPosts.length;
  const worthItCount = reactedPosts.filter((p) => p.myReaction === "worthit").length;
  const skipCount = reactedPosts.filter((p) => p.myReaction === "skip").length;
  const totalReactions = worthItCount + skipCount;
  const worthItPct = totalReactions > 0 ? Math.round((worthItCount / totalReactions) * 100) : 0;
  const timeStr = formatTime(totalScreenTimeSeconds);
  const totalPosts = allPosts.length;

  const sortedPosts = [...allPosts].sort((a, b) => {
    if (postSort === "top") return scorePost(b) - scorePost(a);
    if (postSort === "comments") return b.commentCount - a.commentCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalWorthIt = allPosts.reduce((s, p) => s + p.worthItCount, 0);
  const totalSkip = allPosts.reduce((s, p) => s + p.skipCount, 0);
  const totalVotes = totalWorthIt + totalSkip;
  const overallPct = totalVotes > 0 ? Math.round((totalWorthIt / totalVotes) * 100) : null;

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.green} />}
        >
          {/* Activity overview */}
          <FadeSlide delay={60}><Text style={styles.sectionTitle}>Your Activity</Text></FadeSlide>

          <AnimatedListItem index={0}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Feather name="edit-3" size={20} color={colors.green} />
                <Text style={[styles.statValue, { color: colors.green }]}>{String(totalPosts)}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statCard}>
                <Feather name="zap" size={20} color="#FFD60A" />
                <Text style={[styles.statValue, { color: "#FFD60A" }]}>{String(reactionCount)}</Text>
                <Text style={styles.statLabel}>Reactions</Text>
              </View>
              <View style={[styles.statCard, { borderColor: colors.border, borderWidth: 1 }]}>
                <View style={styles.liveRow}>
                  <Feather name="clock" size={20} color={colors.textSecondary} />
                  <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
                </View>
                <Text style={styles.statValue}>{timeStr}</Text>
                <Text style={styles.statLabel}>Total screen time</Text>
              </View>
            </View>
          </AnimatedListItem>

          {/* Streak */}
          <AnimatedListItem index={1}>
            <View style={[styles.streakCard, streak >= 3 && styles.streakCardActive]}>
              <View style={styles.streakLeft}>
                <View style={[styles.streakIconWrap, { backgroundColor: streak >= 7 ? "rgba(255,214,10,0.15)" : streak >= 3 ? colors.greenDim : colors.surface }]}>
                  <Feather name={streak === 0 ? "sunrise" : streak < 3 ? "trending-up" : streak < 7 ? "zap" : "award"} size={20} color={streak >= 7 ? "#FFD60A" : streak >= 3 ? colors.green : colors.textSecondary} />
                </View>
                <View>
                  <Text style={styles.streakLabel}>Posting Streak</Text>
                  <Text style={styles.streakSub}>
                    {streak === 0 ? "Post today to start your streak" : streak === 1 ? "1 day — keep going!" : `${streak} days in a row`}
                  </Text>
                </View>
              </View>
              <View style={styles.streakBadge}>
                <Text style={[styles.streakNum, streak >= 3 && { color: streak >= 7 ? "#FFD60A" : colors.green }]}>{streak}</Text>
                <Text style={styles.streakUnit}>day{streak !== 1 ? "s" : ""}</Text>
              </View>
            </View>
          </AnimatedListItem>

          {/* Reactions given */}
          {reactionCount > 0 && (
            <AnimatedListItem index={2}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Reactions given</Text>
                <View style={styles.reactionRow}>
                  <View style={styles.reactionItem}>
                    <View style={[styles.reactionIconBox, { backgroundColor: colors.greenDim }]}>
                      <Feather name="check" size={16} color={colors.green} />
                    </View>
                    <Text style={styles.reactionCount}>{worthItCount}</Text>
                    <Text style={styles.reactionLabel}>Worth it</Text>
                  </View>
                  <View style={styles.reactionDivider} />
                  <View style={styles.reactionItem}>
                    <View style={[styles.reactionIconBox, { backgroundColor: "#FF453A18" }]}>
                      <Feather name="x" size={16} color="#FF453A" />
                    </View>
                    <Text style={styles.reactionCount}>{skipCount}</Text>
                    <Text style={styles.reactionLabel}>Skip</Text>
                  </View>
                </View>
                {totalReactions > 0 && (
                  <>
                    <View style={styles.dualBar}>
                      <View style={[styles.dualBarGreen, { flex: worthItCount }]} />
                      <View style={[styles.dualBarRed, { flex: skipCount }]} />
                    </View>
                    <Text style={styles.progressLabel}>{worthItPct}% Worth it across your reactions</Text>
                  </>
                )}
              </View>
            </AnimatedListItem>
          )}

          {/* Post Performance */}
          {allPosts.length > 0 && (
            <>
              <AnimatedListItem index={3}>
                <View style={styles.postStatsHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Post Performance</Text>
                    {overallPct !== null && (
                      <Text style={styles.overallPct}>
                        Overall: <Text style={{ color: colors.green }}>{overallPct}% worth it</Text> · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                      </Text>
                    )}
                  </View>
                  <View style={styles.sortToggle}>
                    {(["recent", "top", "comments"] as PostSort[]).map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.sortBtn, postSort === s && styles.sortBtnActive]}
                        onPress={() => setPostSort(s)}
                      >
                        <Feather
                          name={s === "recent" ? "clock" : s === "top" ? "award" : "message-circle"}
                          size={13}
                          color={postSort === s ? colors.text : colors.textTertiary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </AnimatedListItem>

              {sortedPosts.map((post, i) => {
                const total = post.worthItCount + post.skipCount;
                const pct = total > 0 ? Math.round((post.worthItCount / total) * 100) : null;
                const skipPct = pct !== null ? 100 - pct : null;
                return (
                  <AnimatedListItem key={post.id} index={4 + i}>
                    <TouchableOpacity
                      style={styles.postStatCard}
                      onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}
                      activeOpacity={0.82}
                    >
                      {/* Content preview */}
                      <Text style={styles.postStatContent} numberOfLines={2}>{post.content}</Text>

                      {/* Stat chips row */}
                      <View style={styles.postStatChips}>
                        <View style={[styles.statChip, { backgroundColor: colors.greenDim }]}>
                          <Feather name="check" size={12} color={colors.green} />
                          <Text style={[styles.statChipText, { color: colors.green }]}>{post.worthItCount}</Text>
                        </View>
                        <View style={[styles.statChip, { backgroundColor: "#FF3B3015" }]}>
                          <Feather name="x" size={12} color="#FF3B30" />
                          <Text style={[styles.statChipText, { color: "#FF3B30" }]}>{post.skipCount}</Text>
                        </View>
                        <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                          <Feather name="message-circle" size={12} color={colors.textSecondary} />
                          <Text style={[styles.statChipText, { color: colors.textSecondary }]}>{post.commentCount}</Text>
                        </View>
                        {pct !== null && (
                          <View style={[styles.statChip, { backgroundColor: pct >= 50 ? colors.greenDim : "#FF3B3015", marginLeft: "auto" }]}>
                            <Text style={[styles.statChipPct, { color: pct >= 50 ? colors.green : "#FF3B30" }]}>{pct}%</Text>
                            <Text style={[styles.statChipLabel, { color: pct >= 50 ? colors.green : "#FF3B30" }]}>worth it</Text>
                          </View>
                        )}
                      </View>

                      {/* Dual-tone vote bar */}
                      {total > 0 && (
                        <View style={styles.postStatBar}>
                          <View style={[styles.postStatBarGreen, { flex: post.worthItCount || 0 }]} />
                          <View style={[styles.postStatBarRed, { flex: post.skipCount || 0 }]} />
                        </View>
                      )}
                      {total === 0 && (
                        <View style={[styles.postStatBar, { backgroundColor: colors.border }]} />
                      )}

                      <View style={styles.postStatFooter}>
                        {total > 0 ? (
                          <Text style={styles.postStatVoteLabel}>{pct}% worth it · {skipPct}% skip · {total} vote{total !== 1 ? "s" : ""}</Text>
                        ) : (
                          <Text style={styles.postStatNoVotes}>No votes yet — share your post</Text>
                        )}
                        <Feather name="chevron-right" size={14} color={colors.textTertiary} />
                      </View>
                    </TouchableOpacity>
                  </AnimatedListItem>
                );
              })}
            </>
          )}

          {totalPosts === 0 && reactionCount === 0 && (
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
            <Text style={styles.privacyText}>Stats are based on your anonymous activity and are only visible to you.</Text>
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
    sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.text, marginBottom: 2 },
    overallPct: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary },

    statsRow: { flexDirection: "row", gap: 10 },
    statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 16, alignItems: "center", gap: 6 },
    statValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.text },
    statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textTertiary, textAlign: "center" },
    liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },

    streakCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 16,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      borderWidth: 1, borderColor: colors.border,
    },
    streakCardActive: { borderColor: colors.green, backgroundColor: colors.greenDim },
    streakLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    streakIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
    streakLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.text },
    streakSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 2 },
    streakBadge: { alignItems: "center" },
    streakNum: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.textSecondary },
    streakUnit: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textTertiary },

    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 12 },
    cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    reactionRow: { flexDirection: "row", alignItems: "center" },
    reactionItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    reactionIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
    reactionDivider: { width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 16 },
    reactionCount: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.text },
    reactionLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    dualBar: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: colors.surfaceElevated },
    dualBarGreen: { backgroundColor: colors.green },
    dualBarRed: { backgroundColor: "#FF453A" },
    progressLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },

    postStatsHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    sortToggle: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 10, padding: 3, gap: 2 },
    sortBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    sortBtnActive: { backgroundColor: colors.surfaceElevated },

    postStatCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    postStatContent: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.text, lineHeight: 22 },
    postStatChips: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    statChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
    statChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    statChipPct: { fontSize: 14, fontFamily: "Inter_700Bold" },
    statChipLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
    postStatBar: { flexDirection: "row", height: 5, borderRadius: 3, overflow: "hidden" },
    postStatBarGreen: { backgroundColor: colors.green },
    postStatBarRed: { backgroundColor: "#FF3B30" },
    postStatFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    postStatVoteLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    postStatNoVotes: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary, fontStyle: "italic" },

    emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textTertiary, textAlign: "center", lineHeight: 21, paddingHorizontal: 20 },
    postBtn: { marginTop: 8, backgroundColor: colors.green, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
    postBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" },
    privacyNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingTop: 8 },
    privacyText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary, lineHeight: 18 },
  });
}
