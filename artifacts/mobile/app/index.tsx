import { Image } from "expo-image";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";

function SplashScreen({ onDone, colors }: { onDone: () => void; colors: ReturnType<typeof useTheme>["colors"] }) {
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const calledDone = useRef(false);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });

    textOpacity.value = withDelay(400, withTiming(1, { duration: 450 }));

    dotOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));

    const timer = setTimeout(() => {
      if (!calledDone.current) {
        calledDone.current = true;
        onDone();
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: (1 - textOpacity.value) * 12 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <View style={[splash.container, { backgroundColor: colors.background }]}>
      <View style={splash.center}>
        <Animated.View style={[splash.iconWrap, logoStyle]}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={splash.icon}
            contentFit="cover"
          />
        </Animated.View>

        <Animated.Text style={[splash.appName, { color: colors.text }, textStyle]}>
          BlindFeed
        </Animated.Text>

        <Animated.Text style={[splash.tagline, { color: colors.textSecondary }, textStyle]}>
          Speak freely. Anonymously.
        </Animated.Text>
      </View>

      <Animated.View style={[splash.dotRow, dotStyle]}>
        <View style={[splash.dot, { backgroundColor: colors.green, opacity: 0.8 }]} />
        <View style={[splash.dot, { backgroundColor: colors.green, opacity: 0.5 }]} />
        <View style={[splash.dot, { backgroundColor: colors.green, opacity: 0.25 }]} />
      </Animated.View>
    </View>
  );
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 20,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 26,
    overflow: "hidden",
    marginBottom: 4,
  },
  icon: { width: 100, height: 100 },
  appName: {
    fontSize: 36,
    fontFamily: "JetBrainsMono_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "JetBrainsMono_400Regular",
    letterSpacing: 0.2,
  },
  dotRow: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default function EntryScreen() {
  const { colors } = useTheme();
  const { registered, onboarded, appInitialized } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 24;

  const [showSplash, setShowSplash] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!appInitialized) return;
    if (registered && onboarded) {
      setShowSplash(true);
    } else {
      setReady(true);
    }
  }, [appInitialized, registered, onboarded]);

  const handleSplashDone = () => {
    router.replace("/feed");
  };

  if (!appInitialized) return null;

  if (showSplash) {
    return <SplashScreen onDone={handleSplashDone} colors={colors} />;
  }

  if (!ready) return null;

  const handleContinue = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!registered) {
      router.replace("/register");
    } else if (!onboarded) {
      router.push("/onboarding");
    } else {
      router.replace("/feed");
    }
  };

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.logoSection}>
        <View style={styles.iconWrapper}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.icon}
            contentFit="cover"
          />
        </View>
        <Text style={styles.appName}>BlindFeed</Text>
        <Text style={styles.subtitle}>
          Join the conversation without revealing{"\n"}who you are
        </Text>
      </Animated.View>

      <View style={styles.spacer} />

      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.bottomSection}>
        <View style={styles.trustRow}>
          <Feather name="shield" size={15} color={colors.green} />
          <Text style={styles.trustText}>No identity. No tracking.</Text>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Create account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.loginButtonText}>Log in</Text>
        </TouchableOpacity>

        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Feather name="eye-off" size={11} color={colors.textSecondary} />
            <Text style={styles.pillText}>Private</Text>
          </View>
          <Text style={styles.pillDot}>·</Text>
          <Text style={styles.pillText}>Anonymous</Text>
          <Text style={styles.pillDot}>·</Text>
          <View style={styles.pill}>
            <Feather name="lock" size={11} color={colors.textSecondary} />
            <Text style={styles.pillText}>Secure</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
    },
    logoSection: {
      alignItems: "center",
      marginTop: 80,
      gap: 16,
    },
    iconWrapper: {
      width: 88,
      height: 88,
      borderRadius: 22,
      overflow: "hidden",
      marginBottom: 8,
    },
    icon: { width: 88, height: 88 },
    appName: {
      fontSize: 34,
      fontFamily: "JetBrainsMono_700Bold",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    spacer: { flex: 1 },
    bottomSection: {
      width: "100%",
      paddingHorizontal: 24,
      gap: 14,
      alignItems: "center",
    },
    trustRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    trustText: {
      fontSize: 14,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.textSecondary,
    },
    ctaButton: {
      width: "100%",
      height: 56,
      backgroundColor: colors.green,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    ctaText: {
      fontSize: 17,
      fontFamily: "JetBrainsMono_600SemiBold",
      color: "#000000",
    },
    loginButton: {
      width: "100%",
      height: 54,
      backgroundColor: "transparent",
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    loginButtonText: {
      fontSize: 17,
      fontFamily: "JetBrainsMono_600SemiBold",
      color: colors.text,
    },
    pillsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    pillText: {
      fontSize: 13,
      fontFamily: "JetBrainsMono_400Regular",
      color: colors.textSecondary,
    },
    pillDot: {
      fontSize: 13,
      color: colors.textTertiary,
    },
  });
}
