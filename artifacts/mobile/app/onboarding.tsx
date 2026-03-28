import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const { width } = Dimensions.get("window");

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const { setOnboarded } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 24;
  const scrollX = useRef(new Animated.Value(0)).current;

  const slide = SLIDES[currentSlide];

  const handleNext = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (slide.isLast) {
      await setOnboarded();
      router.replace("/feed");
    } else {
      setCurrentSlide((s) => s + 1);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i <= currentSlide && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>

      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <Image
          source={slide.image}
          style={styles.illustration}
          contentFit="cover"
        />
      </View>

      {/* Bottom text + button */}
      <View style={styles.bottomSection}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, slide.isLast && styles.buttonGreen]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, slide.isLast && styles.buttonTextDark]}>
            {slide.cta}
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
  progressBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 12,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  progressSegmentActive: {
    backgroundColor: Colors.green,
  },
  illustrationContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: 380,
    alignSelf: "stretch",
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 24,
  },
  textBlock: {
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonGreen: {
    backgroundColor: Colors.green,
  },
  buttonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  buttonTextDark: {
    color: "#000000",
  },
});
