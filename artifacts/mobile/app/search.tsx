import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { api, ApiPost } from "@/utils/api";
import { timeAgo } from "@/utils/time";
import { ScreenTransition, FadeSlide, AnimatedListItem, AnimatedPressable } from "@/components/Animations";

const SUGGESTIONS = ["Popular today", "Trending", "Random", "Most reacted", "New voices"];

type SearchMode = "posts" | "users";

export default function SearchScreen() {
  const { colors } = useTheme();
  const { getActivePosts } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [mode, setMode] = useState<SearchMode>("posts");
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "anonymous thoughts",
    "productivity",
    "unpopular opinion",
  ]);
  const [userIdQuery, setUserIdQuery] = useState("");
  const [userPosts, setUserPosts] = useState<ApiPost[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userProfileVisible, setUserProfileVisible] = useState(false);
  const [searchedUserId, setSearchedUserId] = useState<string>("");
  const inputRef = useRef<TextInput>(null);
  const userInputRef = useRef<TextInput>(null);

  const allPosts = getActivePosts("fresh");
  const results = query.trim().length > 0
    ? allPosts.filter((p) => p.content.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleSearch = (text: string) => {
    if (!text.trim()) return;
    setRecentSearches((prev) => [text, ...prev.filter((s) => s !== text)].slice(0, 5));
    setQuery(text);
  };

  const clearRecent = (term: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== term));
  };

  const handleUserSearch = async () => {
    const uid = userIdQuery.trim();
    if (!uid) return;
    setUserLoading(true);
    setUserError(null);
    setUserPosts([]);
    try {
      const data = await api.get<ApiPost[]>(`/users/${encodeURIComponent(uid)}/posts`);
      setSearchedUserId(uid);
      setUserPosts(data);
      setUserProfileVisible(true);
    } catch {
      setUserError("User not found or has no active posts.");
    } finally {
      setUserLoading(false);
    }
  };

  const showResults = query.trim().length > 0;
  const showEmpty = showResults && results.length === 0;
  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top }]}>
        <FadeSlide delay={0} from="top">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.searchBar}>
              <Feather name={mode === "posts" ? "search" : "user"} size={16} color={colors.textTertiary} />
              <TextInput
                ref={mode === "posts" ? inputRef : userInputRef}
                style={styles.searchInput}
                placeholder={mode === "posts" ? "Search posts..." : "Enter user ID (e.g. anon_abc123...)"}
                placeholderTextColor={colors.textTertiary}
                value={mode === "posts" ? query : userIdQuery}
                onChangeText={mode === "posts" ? setQuery : setUserIdQuery}
                onSubmitEditing={mode === "posts" ? () => handleSearch(query) : handleUserSearch}
                returnKeyType="search"
                autoFocus
                autoCapitalize="none"
              />
              {(mode === "posts" ? query : userIdQuery).length > 0 && (
                <TouchableOpacity onPress={() => mode === "posts" ? setQuery("") : setUserIdQuery("")}>
                  <Feather name="x-circle" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === "posts" && styles.modeTabActive]}
              onPress={() => { setMode("posts"); setUserIdQuery(""); setUserError(null); }}
              activeOpacity={0.8}
            >
              <Feather name="file-text" size={13} color={mode === "posts" ? colors.green : colors.textSecondary} />
              <Text style={[styles.modeTabText, mode === "posts" && { color: colors.green }]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === "users" && styles.modeTabActive]}
              onPress={() => { setMode("users"); setQuery(""); }}
              activeOpacity={0.8}
            >
              <Feather name="users" size={13} color={mode === "users" ? colors.green : colors.textSecondary} />
              <Text style={[styles.modeTabText, mode === "users" && { color: colors.green }]}>Users</Text>
            </TouchableOpacity>
          </View>
        </FadeSlide>

        {mode === "posts" ? (
          <FlatList
            data={showResults ? results : []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              !showResults ? (
                <View style={styles.suggestions}>
                  <Text style={styles.sectionLabel}>Explore</Text>
                  <View style={styles.chips}>
                    {SUGGESTIONS.map((s) => (
                      <TouchableOpacity key={s} style={styles.chip} onPress={() => handleSearch(s)} activeOpacity={0.8}>
                        <Text style={styles.chipText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {recentSearches.length > 0 && (
                    <>
                      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Recent</Text>
                      {recentSearches.map((term) => (
                        <View key={term} style={styles.recentRow}>
                          <Feather name="clock" size={15} color={colors.textTertiary} />
                          <TouchableOpacity style={styles.recentTerm} onPress={() => setQuery(term)}>
                            <Text style={styles.recentText}>{term}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => clearRecent(term)}>
                            <Feather name="x" size={15} color={colors.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              ) : showEmpty ? (
                <View style={styles.emptyState}>
                  <Feather name="search" size={40} color={colors.textTertiary} />
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySub}>Try different keywords</Text>
                </View>
              ) : (
                <Text style={styles.sectionLabel}>{results.length} result{results.length !== 1 ? "s" : ""}</Text>
              )
            }
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                <TouchableOpacity
                  style={styles.resultCard}
                  onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resultText} numberOfLines={3}>{item.content}</Text>
                  <View style={styles.resultMeta}>
                    <Text style={styles.resultTime}>{timeAgo(item.createdAt)}</Text>
                    <View style={styles.resultReactions}>
                      <Feather name="check" size={12} color={colors.green} />
                      <Text style={styles.resultCount}>{item.worthItCount}</Text>
                      <Feather name="x" size={12} color={colors.textTertiary} style={{ marginLeft: 8 }} />
                      <Text style={styles.resultCount}>{item.skipCount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </AnimatedListItem>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : (
          <View style={[styles.listContent, { paddingBottom: bottom + 24 }]}>
            <FadeSlide delay={60}>
              <View style={styles.userSearchHint}>
                <Feather name="info" size={14} color={colors.textTertiary} />
                <Text style={styles.userSearchHintText}>
                  Enter an exact anonymous user ID to view their profile and posts.
                </Text>
              </View>
              <AnimatedPressable
                style={[styles.userSearchBtn, !userIdQuery.trim() && { opacity: 0.4 }]}
                onPress={handleUserSearch}
                disabled={!userIdQuery.trim() || userLoading}
                scaleTo={0.96}
              >
                {userLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Feather name="user" size={16} color="#000" />
                    <Text style={styles.userSearchBtnText}>Find user</Text>
                  </>
                )}
              </AnimatedPressable>
              {userError && (
                <View style={styles.userErrorRow}>
                  <Feather name="alert-circle" size={15} color="#FF3B30" />
                  <Text style={styles.userErrorText}>{userError}</Text>
                </View>
              )}
            </FadeSlide>
          </View>
        )}

        <Modal
          visible={userProfileVisible}
          animationType="slide"
          onRequestClose={() => setUserProfileVisible(false)}
        >
          <View style={[styles.profileModal, { paddingTop: top }]}>
            <View style={styles.profileHeader}>
              <TouchableOpacity onPress={() => setUserProfileVisible(false)} style={styles.profileBackBtn}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.profileTitleCol}>
                <Text style={styles.profileTitle}>User Profile</Text>
                <Text style={styles.profileId} numberOfLines={1}>{searchedUserId}</Text>
              </View>
              <View style={styles.profilePostsBadge}>
                <Text style={styles.profilePostsCount}>{userPosts.length}</Text>
                <Text style={styles.profilePostsLabel}>posts</Text>
              </View>
            </View>

            <FlatList
              data={userPosts}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32, gap: 12 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.profilePostCard}
                  onPress={() => {
                    setUserProfileVisible(false);
                    router.push({ pathname: "/post/[id]", params: { id: item.id } });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.profilePostText} numberOfLines={4}>{item.content}</Text>
                  <View style={styles.profilePostMeta}>
                    <Text style={styles.profilePostTime}>{timeAgo(typeof item.createdAt === "string" ? new Date(item.createdAt).getTime() : item.createdAt)}</Text>
                    <View style={styles.profilePostReactions}>
                      <Feather name="check" size={12} color={colors.green} />
                      <Text style={styles.profilePostCount}>{item.worthItCount}</Text>
                      <Feather name="x" size={12} color={colors.textTertiary} style={{ marginLeft: 8 }} />
                      <Text style={styles.profilePostCount}>{item.skipCount}</Text>
                      <Feather name="message-circle" size={12} color={colors.textTertiary} style={{ marginLeft: 8 }} />
                      <Text style={styles.profilePostCount}>{item.commentCount}</Text>
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
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, height: 46 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text },
    modeTabs: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 3,
      gap: 2,
    },
    modeTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: 10,
    },
    modeTabActive: { backgroundColor: colors.surfaceElevated },
    modeTabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary },
    listContent: { paddingHorizontal: 16, paddingTop: 8 },
    suggestions: { paddingBottom: 8 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.textTertiary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12, marginLeft: 2 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: colors.border },
    chipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.text },
    recentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
    recentTerm: { flex: 1 },
    recentText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    resultCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
    resultText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text, lineHeight: 23 },
    resultMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    resultTime: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    resultReactions: { flexDirection: "row", alignItems: "center", gap: 4 },
    resultCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    userSearchHint: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    userSearchHintText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: 19 },
    userSearchBtn: {
      height: 52,
      backgroundColor: colors.green,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 16,
    },
    userSearchBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
    userErrorRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
    userErrorText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#FF3B30", flex: 1 },
    profileModal: { flex: 1, backgroundColor: colors.background },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    profileBackBtn: { padding: 4 },
    profileTitleCol: { flex: 1, gap: 2 },
    profileTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.text },
    profileId: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    profilePostsBadge: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    profilePostsCount: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.green },
    profilePostsLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    profilePostCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      gap: 10,
    },
    profilePostText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text, lineHeight: 22 },
    profilePostMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    profilePostTime: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    profilePostReactions: { flexDirection: "row", alignItems: "center", gap: 4 },
    profilePostCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
  });
}
