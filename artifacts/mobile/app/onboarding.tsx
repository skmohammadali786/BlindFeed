import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { ScreenTransition, AnimatedPressable, FadeSlide } from "@/components/Animations";

const SLIDES = [
  {
    image: require("@/assets/images/onboarding_followers.png"),
    title: "No followers",
    subtitle: "No popularity contest",
    cta: "Continue",
    isLast: false,
  },
  {
    image: require("@/assets/images/onboarding_likes.png"),
    title: "No likes",
    subtitle: "No fake validation",
    cta: "Continue",
    isLast: false,
  },
  {
    image: require("@/assets/images/onboarding_content.png"),
    title: "Only real content",
    subtitle: "Content stands on its own",
    cta: "Enter the feed",
    isLast: true,
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { setOnboarded } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 24;
  const slide = SLIDES[currentSlide];

  const handleNext = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (slide.isLast) {
      await setOnboarded();
      router.replace("/feed");
    } else {
      setCurrentSlide((s) => s + 1);
    }
  };

  const styles = makeStyles(colors);

  return (
    <ScreenTransition>
      <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
        <FadeSlide delay={0}>
          <View style={styles.progressBar}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.progressSegment, i <= currentSlide && styles.progressSegmentActive]}
              />
            ))}
          </View>
        </FadeSlide>

        <Animated.View
          key={`slide-img-${currentSlide}`}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
          style={styles.illustrationContainer}
        >
          <Image source={slide.image} style={styles.illustration} contentFit="cover" />
        </Animated.View>

        <Animated.View
          key={`slide-text-${currentSlide}`}
          entering={FadeIn.delay(80).duration(350)}
          exiting={FadeOut.duration(150)}
          style={styles.bottomSection}
        >
          <View style={styles.textBlock}>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
          <AnimatedPressable
            style={[styles.button, slide.isLast && styles.buttonGreen]}
            onPress={handleNext}
            scaleTo={0.96}
          >
            <Text style={[styles.buttonText, slide.isLast && styles.buttonTextDark]}>{slide.cta}</Text>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </ScreenTransition>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    progressBar: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginTop: 12 },
    progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.textTertiary },
    progressSegmentActive: { backgroundColor: colors.green },
    illustrationContainer: {
      flex: 1,
      marginHorizontal: 20,
      marginTop: 24,
      borderRadius: 20,
      overflow: "hidden",
      maxHeight: 380,
      alignSelf: "stretch",
    },
    illustration: { width: "100%", height: "100%" },
    bottomSection: { paddingHorizontal: 24, paddingTop: 40, gap: 24 },
    textBlock: { gap: 8 },
    title: { fontSize: 34, fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 17, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    button: {
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonGreen: { backgroundColor: colors.green },
    buttonText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.text },
    buttonTextDark: { color: "#000000" },
  });
}
