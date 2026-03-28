import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { api, ApiPost } from "@/utils/api";
import { timeAgo } from "@/utils/time";
import {
  ScreenTransition,
  FadeSlide,
  AnimatedListItem,
  AnimatedPressable,
} from "@/components/Animations";

const HISTORY_KEY = "bf_search_history";
const MAX_HISTORY = 8;
const DEBOUNCE_MS = 400;

type SortMode = "recent" | "top";
type TabMode = "posts" | "users";

function HighlightText({
  text,
  query,
  style,
  numberOfLines,
}: {
  text: string;
  query: string;
  style: object;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  if (!query.trim()) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text
            key={i}
            style={[
              style,
              {
                fontFamily: "Inter_700Bold",
                backgroundColor: colors.greenDim,
                color: colors.green,
              },
            ]}
          >
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

function RatingBar({
  worthIt,
  skip,
  colors,
}: {
  worthIt: number;
  skip: number;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const total = worthIt + skip;
  const pct = total > 0 ? worthIt / total : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          flex: 1,
          height: 4,
          backgroundColor: colors.border,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            backgroundColor: colors.green,
            borderRadius: 2,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          color: total > 0 ? colors.green : colors.textTertiary,
          minWidth: 32,
          textAlign: "right",
        }}
      >
        {total > 0 ? `${Math.round(pct * 100)}%` : "–"}
      </Text>
    </View>
  );
}

function ResultCard({
  item,
  index,
  query,
  colors,
  styles,
}: {
  item: ApiPost;
  index: number;
  query: string;
  colors: ReturnType<typeof useTheme>["colors"];
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() =>
          router.push({ pathname: "/post/[id]", params: { id: String(item.id) } })
        }
        activeOpacity={0.82}
      >
        <HighlightText
          text={item.content}
          query={query}
          numberOfLines={3}
          style={styles.resultText}
        />
        <RatingBar worthIt={item.worthItCount} skip={item.skipCount} colors={colors} />
        <View style={styles.resultFooter}>
          <Text style={styles.resultTime}>
            {timeAgo(new Date(item.createdAt).getTime())}
          </Text>
          <View style={styles.resultStats}>
            <Feather name="check-circle" size={12} color={colors.green} />
            <Text style={[styles.statNum, { color: colors.green }]}>
              {item.worthItCount}
            </Text>
            <Feather
              name="x-circle"
              size={12}
              color={colors.textTertiary}
            />
            <Text style={styles.statNum}>{item.skipCount}</Text>
            <Feather
              name="message-circle"
              size={12}
              color={colors.textTertiary}
            />
            <Text style={styles.statNum}>{item.commentCount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedListItem>
  );
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [tab, setTab] = useState<TabMode>("posts");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [results, setResults] = useState<ApiPost[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [userIdQuery, setUserIdQuery] = useState("");
  const [userPosts, setUserPosts] = useState<ApiPost[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userProfileVisible, setUserProfileVisible] = useState(false);
  const [searchedUserId, setSearchedUserId] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (raw) {
        try {
          setHistory(JSON.parse(raw));
        } catch (_) {}
      }
    });
    api
      .get<{ topics: string[] }>("/posts/trending")
      .then((data) => setTrending(data.topics))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get<ApiPost[]>(
          `/posts/search?q=${encodeURIComponent(q)}&sort=${sort}`
        );
        setResults(data);
        setHasSearched(true);
        setHistory((prev) => {
          const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(
            0,
            MAX_HISTORY
          );
          AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          return next;
        });
      } catch (_) {
        setResults([]);
        setHasSearched(true);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sort]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const removeHistoryItem = useCallback((term: string) => {
    setHistory((prev) => {
      const next = prev.filter((s) => s !== term);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleUserSearch = async () => {
    const uid = userIdQuery.trim();
    if (!uid) return;
    if (!uid.startsWith("anon_") || uid.length < 10) {
      setUserError(
        "Enter a valid ID starting with 'anon_' — copy it from a user's Identity screen."
      );
      return;
    }
    setUserLoading(true);
    setUserError(null);
    setUserPosts([]);
    try {
      const data = await api.get<ApiPost[]>(`/users/${encodeURIComponent(uid)}/posts`);
      if (data.length === 0) {
        setUserError(
          "No active posts for this ID. It may have reset or all posts have expired."
        );
        return;
      }
      setSearchedUserId(uid);
      setUserPosts(data);
      setUserProfileVisible(true);
    } catch {
      setUserError("Couldn't find this user. Check the ID and try again.");
    } finally {
      setUserLoading(false);
    }
  };

  const userTotalWorthIt = userPosts.reduce((a, p) => a + p.worthItCount, 0);
  const userTotalSkip = userPosts.reduce((a, p) => a + p.skipCount, 0);
  const userTotalComments = userPosts.reduce((a, p) => a + p.commentCount, 0);
  const userApprovalTotal = userTotalWorthIt + userTotalSkip;

  const styles = makeStyles(colors);
  const isActiveSearch = query.trim().length >= 2;

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        {/* ─── Header ─── */}
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.searchBar}>
              {searching ? (
                <ActivityIndicator size="small" color={colors.green} />
              ) : (
                <Feather
                  name="search"
                  size={16}
                  color={query ? colors.green : colors.textTertiary}
                />
              )}
              <TextInput
                style={styles.searchInput}
                placeholder={
                  tab === "posts" ? "Search all posts…" : "Paste user ID (anon_…)"
                }
                placeholderTextColor={colors.textTertiary}
                value={tab === "posts" ? query : userIdQuery}
                onChangeText={tab === "posts" ? setQuery : setUserIdQuery}
                onSubmitEditing={tab === "users" ? handleUserSearch : undefined}
                returnKeyType={tab === "users" ? "search" : "done"}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />
              {(tab === "posts" ? query : userIdQuery).length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    if (tab === "posts") {
                      setQuery("");
                    } else {
                      setUserIdQuery("");
                      setUserError(null);
                    }
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x-circle" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(["posts", "users"] as TabMode[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => {
                  setTab(t);
                  setQuery("");
                  setUserIdQuery("");
                  setUserError(null);
                  setResults([]);
                  setHasSearched(false);
                }}
                activeOpacity={0.8}
              >
                <Feather
                  name={t === "posts" ? "file-text" : "users"}
                  size={13}
                  color={tab === t ? colors.green : colors.textSecondary}
                />
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === "posts" ? "Posts" : "Users"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FadeSlide>

        {/* ─── Posts Tab ─── */}
        {tab === "posts" && (
          <>
            {isActiveSearch ? (
              /* Search Results */
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={[styles.list, { paddingBottom: bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsCount}>
                      {searching
                        ? "Searching…"
                        : hasSearched
                        ? `${results.length} result${results.length !== 1 ? "s" : ""}`
                        : ""}
                    </Text>
                    <View style={styles.sortRow}>
                      {(["recent", "top"] as SortMode[]).map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.sortChip, sort === s && styles.sortChipActive]}
                          onPress={() => setSort(s)}
                          activeOpacity={0.8}
                        >
                          <Feather
                            name={s === "recent" ? "clock" : "trending-up"}
                            size={11}
                            color={sort === s ? colors.green : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.sortChipText,
                              sort === s && { color: colors.green },
                            ]}
                          >
                            {s === "recent" ? "Recent" : "Top rated"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                }
                ListEmptyComponent={
                  !searching ? (
                    <View style={styles.emptyState}>
                      <Feather name="search" size={44} color={colors.textTertiary} />
                      <Text style={styles.emptyTitle}>No results found</Text>
                      <Text style={styles.emptySub}>
                        Try different keywords or shorter phrases
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <ActivityIndicator color={colors.green} />
                    </View>
                  )
                }
                renderItem={({ item, index }) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    index={index}
                    query={query.trim()}
                    colors={colors}
                    styles={styles}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : (
              /* Discovery / Idle */
              <ScrollView
                contentContainerStyle={[styles.list, { paddingBottom: bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Trending section */}
                <FadeSlide delay={60}>
                  <View style={styles.section}>
                    <View style={styles.sectionRow}>
                      <View style={styles.sectionLabelRow}>
                        <Feather name="trending-up" size={14} color={colors.textSecondary} />
                        <Text style={styles.sectionLabel}>Trending now</Text>
                      </View>
                    </View>
                    {trendingLoading ? (
                      <View style={{ paddingVertical: 16, alignItems: "center" }}>
                        <ActivityIndicator size="small" color={colors.green} />
                      </View>
                    ) : (
                      <View style={styles.chips}>
                        {(trending.length > 0
                          ? trending
                          : ["thoughts", "today", "anonymous", "opinion", "work", "life"]
                        ).map((topic) => (
                          <TouchableOpacity
                            key={topic}
                            style={styles.chip}
                            onPress={() => setQuery(topic)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.chipText}>{topic}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </FadeSlide>

                {/* Recent searches */}
                {history.length > 0 && (
                  <FadeSlide delay={100}>
                    <View style={styles.section}>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionLabel}>Recent searches</Text>
                        <TouchableOpacity onPress={clearHistory}>
                          <Text style={styles.clearAll}>Clear all</Text>
                        </TouchableOpacity>
                      </View>
                      {history.map((term) => (
                        <TouchableOpacity
                          key={term}
                          style={styles.historyRow}
                          onPress={() => setQuery(term)}
                          activeOpacity={0.8}
                        >
                          <Feather name="clock" size={14} color={colors.textTertiary} />
                          <Text style={styles.historyText} numberOfLines={1}>
                            {term}
                          </Text>
                          <TouchableOpacity
                            onPress={() => removeHistoryItem(term)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="x" size={14} color={colors.textTertiary} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </FadeSlide>
                )}

                {/* Tip card */}
                <FadeSlide delay={140}>
                  <View style={styles.tipCard}>
                    <Feather name="zap" size={14} color={colors.green} />
                    <Text style={styles.tipText}>
                      Search all anonymous posts in real-time. Type at least 2 characters to start.
                    </Text>
                  </View>
                </FadeSlide>
              </ScrollView>
            )}
          </>
        )}

        {/* ─── Users Tab ─── */}
        {tab === "users" && (
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FadeSlide delay={60}>
              <View style={styles.guideCard}>
                <Text style={styles.guideTitle}>How to find a user</Text>
                {[
                  {
                    n: "1",
                    t: "Ask the person to share their anonymous ID from their Identity screen",
                  },
                  {
                    n: "2",
                    t: "Paste the ID above — it always starts with anon_",
                  },
                  {
                    n: "3",
                    t: "Browse their active posts without revealing either identity",
                  },
                ].map(({ n, t }) => (
                  <View key={n} style={styles.guideStep}>
                    <View style={styles.stepBubble}>
                      <Text style={styles.stepBubbleText}>{n}</Text>
                    </View>
                    <Text style={styles.guideStepText}>{t}</Text>
                  </View>
                ))}
              </View>

              <AnimatedPressable
                style={[
                  styles.searchBtn,
                  (!userIdQuery.trim() || userLoading) && { opacity: 0.45 },
                ]}
                onPress={handleUserSearch}
                disabled={!userIdQuery.trim() || userLoading}
                scaleTo={0.96}
              >
                {userLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="user" size={16} color="#fff" />
                    <Text style={styles.searchBtnText}>Find this user</Text>
                  </>
                )}
              </AnimatedPressable>

              {userError && (
                <View style={styles.errorRow}>
                  <Feather name="alert-circle" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{userError}</Text>
                </View>
              )}
            </FadeSlide>
          </ScrollView>
        )}

        {/* ─── User Profile Modal ─── */}
        <Modal
          visible={userProfileVisible}
          animationType="slide"
          onRequestClose={() => setUserProfileVisible(false)}
        >
          <View style={[styles.modal, { paddingTop: top }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setUserProfileVisible(false)}
                style={styles.modalClose}
              >
                <Feather name="arrow-left" size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.modalTitle}>Anonymous Profile</Text>
                <Text style={styles.modalId} numberOfLines={1}>
                  {searchedUserId}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { value: String(userPosts.length), label: "Posts" },
                { value: String(userTotalWorthIt), label: "Worth It", green: true },
                { value: String(userTotalComments), label: "Comments" },
                {
                  value:
                    userApprovalTotal > 0
                      ? `${Math.round((userTotalWorthIt / userApprovalTotal) * 100)}%`
                      : "–",
                  label: "Approval",
                  green: true,
                },
              ].map(({ value, label, green }) => (
                <View key={label} style={styles.statCard}>
                  <Text style={[styles.statValue, green && { color: colors.green }]}>
                    {value}
                  </Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <FlatList
              data={userPosts}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: bottom + 32,
                gap: 12,
              }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.profileCard}
                  onPress={() => {
                    setUserProfileVisible(false);
                    router.push({ pathname: "/post/[id]", params: { id: String(item.id) } });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.profileCardText} numberOfLines={4}>
                    {item.content}
                  </Text>
                  <RatingBar
                    worthIt={item.worthItCount}
                    skip={item.skipCount}
                    colors={colors}
                  />
                  <View style={styles.resultFooter}>
                    <Text style={styles.resultTime}>
                      {timeAgo(
                        typeof item.createdAt === "string"
                          ? new Date(item.createdAt).getTime()
                          : item.createdAt
                      )}
                    </Text>
                    <View style={styles.resultStats}>
                      <Feather name="check-circle" size={12} color={colors.green} />
                      <Text style={[styles.statNum, { color: colors.green }]}>
                        {item.worthItCount}
                      </Text>
                      <Feather name="message-circle" size={12} color={colors.textTertiary} />
                      <Text style={styles.statNum}>{item.commentCount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="wind" size={36} color={colors.textTertiary} />
                  <Text style={styles.emptyTitle}>No active posts</Text>
                  <Text style={styles.emptySub}>This user has no active posts</Text>
                </View>
              }
            />
          </View>
        </Modal>
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
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
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
    },

    tabs: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 6,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 3,
      gap: 2,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
    },
    tabActive: { backgroundColor: colors.surfaceElevated },
    tabText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    tabTextActive: { color: colors.green, fontFamily: "Inter_600SemiBold" },

    list: { paddingHorizontal: 16, paddingTop: 8 },

    resultsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      minHeight: 28,
    },
    resultsCount: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    sortRow: { flexDirection: "row", gap: 6 },
    sortChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortChipActive: {
      borderColor: colors.green,
      backgroundColor: colors.greenDim,
    },
    sortChipText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },

    resultCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resultText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 23,
    },
    resultFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    resultTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    resultStats: { flexDirection: "row", alignItems: "center", gap: 4 },
    statNum: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginRight: 4,
    },

    section: { marginBottom: 24 },
    sectionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    sectionLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    clearAll: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.green,
    },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.text,
    },

    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 12,
    },
    historyText: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },

    tipCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.greenDim,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.green + "33",
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 19,
    },

    guideCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      gap: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    guideTitle: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      marginBottom: 4,
    },
    guideStep: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    stepBubble: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.green,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
      marginTop: 1,
    },
    stepBubbleText: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    guideStepText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 20,
    },

    searchBtn: {
      height: 52,
      backgroundColor: colors.green,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 14,
    },
    searchBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },

    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255,59,48,0.08)",
      borderRadius: 10,
      padding: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: "#FF3B30",
      lineHeight: 20,
    },

    emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
    },
    emptySub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      textAlign: "center",
    },

    modal: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 12,
    },
    modalClose: { padding: 4 },
    modalTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.text,
    },
    modalId: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },

    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    statCard: {
      flex: 1,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 12,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.text,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },

    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileCardText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      lineHeight: 22,
    },
    profileCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
  });
}
