import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
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
import { timeAgo } from "@/utils/time";

const SUGGESTIONS = ["Popular today", "Trending", "Random", "Most reacted", "New voices"];

export default function SearchScreen() {
  const { colors } = useTheme();
  const { getActivePosts } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 16;

  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "anonymous thoughts",
    "productivity",
    "unpopular opinion",
  ]);
  const inputRef = useRef<TextInput>(null);

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

  const showResults = query.trim().length > 0;
  const showEmpty = showResults && results.length === 0;
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search posts..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(query)}
            returnKeyType="search"
            autoFocus
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
        renderItem={({ item }) => (
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
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
    searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, height: 46 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text },
    listContent: { paddingHorizontal: 16, paddingTop: 8 },
    suggestions: { paddingBottom: 8 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.textTertiary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12, marginLeft: 2 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: colors.border },
    chipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.text },
    recentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
    recentTerm: { flex: 1 },
    recentText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
    emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    resultCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
    resultText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text, lineHeight: 23 },
    resultMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    resultTime: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    resultReactions: { flexDirection: "row", alignItems: "center", gap: 4 },
    resultCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textTertiary },
  });
}
