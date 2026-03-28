import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

export default function EntryScreen() {
  const { onboarded, setOnboarded } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const top = isWeb ? 67 : insets.top;
  const bottom = isWeb ? 34 : insets.bottom > 0 ? insets.bottom : 24;

  const handleContinue = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (onboarded) {
      router.replace("/feed");
    } else {
      router.push("/onboarding");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.iconWrapper}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.icon}
            contentFit="cover"
          />
        </View>
        <Text style={styles.appName}>Enter BlindFeed</Text>
        <Text style={styles.subtitle}>
          Join the conversation without revealing{"\n"}who you are
        </Text>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        <View style={styles.trustRow}>
          <Feather name="shield" size={15} color={Colors.green} />
          <Text style={styles.trustText}>No identity. No tracking.</Text>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Continue anonymously</Text>
        </TouchableOpacity>

        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Feather name="eye-off" size={11} color={Colors.textSecondary} />
            <Text style={styles.pillText}>Private</Text>
          </View>
          <Text style={styles.pillDot}>·</Text>
          <Text style={styles.pillText}>Anonymous</Text>
          <Text style={styles.pillDot}>·</Text>
          <View style={styles.pill}>
            <Feather name="lock" size={11} color={Colors.textSecondary} />
            <Text style={styles.pillText}>Secure</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.surface,
  },
  icon: {
    width: 88,
    height: 88,
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    width: "100%",
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "center",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trustText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  ctaButton: {
    width: "100%",
    height: 56,
    backgroundColor: Colors.green,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  pillDot: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
});
