import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { api } from "@/utils/api";
import { ScreenTransition, FadeSlide, AnimatedPressable } from "@/components/Animations";

const CATEGORIES = ["UI / Design", "Performance", "Anonymity", "Content quality", "Overall experience"];

export default function RateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 24;

  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const displayStars = hoveredStar || stars;

  const starLabels = ["", "Poor", "Fair", "Good", "Great", "Amazing!"];

  const handleSubmit = async () => {
    if (stars === 0 || submitting) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      await api.post("/ratings", {
        stars,
        category: category ?? undefined,
        feedback: feedback.trim() || undefined,
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch {
      Alert.alert("Error", "Could not submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const styles = makeStyles(colors);

  if (submitted) {
    return (
      <ScreenTransition>
        <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
          <FadeSlide delay={0} style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Feather name="heart" size={36} color={colors.green} />
            </View>
            <Text style={styles.successTitle}>Thank you!</Text>
            <Text style={styles.successSub}>
              Your feedback helps us make BlindFeed better for everyone.
            </Text>
            <AnimatedPressable style={styles.doneBtn} onPress={() => router.back()} scaleTo={0.96}>
              <Text style={styles.doneBtnText}>Back to settings</Text>
            </AnimatedPressable>
          </FadeSlide>
        </View>
      </ScreenTransition>
    );
  }

  return (
    <ScreenTransition>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FadeSlide delay={0} from="top">
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rate BlindFeed</Text>
            <View style={{ width: 32 }} />
          </View>
        </FadeSlide>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottom + 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FadeSlide delay={60}>
            <View style={styles.introSection}>
              <View style={styles.appIconWrap}>
                <Feather name="star" size={30} color={colors.green} />
              </View>
              <Text style={styles.introTitle}>How are we doing?</Text>
              <Text style={styles.introSub}>
                Your honest feedback shapes the future of BlindFeed.
              </Text>
            </View>
          </FadeSlide>

          <FadeSlide delay={120}>
            <Text style={styles.sectionLabel}>Your rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => {
                    setStars(n);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  onPressIn={() => setHoveredStar(n)}
                  onPressOut={() => setHoveredStar(0)}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                >
                  <Feather
                    name="star"
                    size={44}
                    color={n <= displayStars ? "#FFB800" : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {displayStars > 0 && (
              <Text style={styles.starLabel}>{starLabels[displayStars]}</Text>
            )}
          </FadeSlide>

          <FadeSlide delay={180}>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>What are you rating? (optional)</Text>
            <View style={styles.categoriesWrap}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(category === cat ? null : cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FadeSlide>

          <FadeSlide delay={240}>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Tell us more (optional)</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="What did you love? What could be better?"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{feedback.length}/500</Text>
          </FadeSlide>

          <FadeSlide delay={300}>
            <AnimatedPressable
              style={[styles.submitBtn, (stars === 0 || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={stars === 0 || submitting}
              scaleTo={0.96}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.submitBtnText}>Submit rating</Text>
              )}
            </AnimatedPressable>
          </FadeSlide>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text },
    introSection: { alignItems: "center", paddingVertical: 28, gap: 12 },
    appIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.greenDim,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    introTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.3 },
    introSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 14,
    },
    starsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 10 },
    starBtn: { padding: 4 },
    starLabel: { textAlign: "center", fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFB800", marginBottom: 4 },
    categoriesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipActive: { backgroundColor: colors.greenDim, borderColor: colors.green },
    categoryText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.text },
    categoryTextActive: { color: colors.green },
    feedbackInput: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.text,
      minHeight: 110,
      lineHeight: 22,
    },
    charCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textTertiary, textAlign: "right", marginTop: 6 },
    submitBtn: {
      height: 56,
      backgroundColor: colors.green,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 32,
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#000" },
    successContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, paddingHorizontal: 32 },
    successIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.greenDim,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    successTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.3 },
    successSub: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
    doneBtn: {
      marginTop: 16,
      height: 52,
      width: "100%",
      backgroundColor: colors.green,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    doneBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000" },
  });
}
