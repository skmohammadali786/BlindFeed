import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "@/components/Header";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

interface RuleItemProps {
  icon: string;
  title: string;
  desc: string;
}

function RuleItem({ icon, title, desc }: RuleItemProps) {
  return (
    <View style={styles.ruleItem}>
      <View style={styles.ruleIcon}>
        <Feather name={icon as any} size={18} color={Colors.textSecondary} />
      </View>
      <View style={styles.ruleContent}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleDesc}>{desc}</Text>
      </View>
    </View>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function AboutScreen() {
  const { tempUserId } = useApp();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const bottomPadding = isWeb ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <Header title="about" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + (isWeb ? 84 : 90) },
        ]}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="eye-off" size={32} color={Colors.text} />
          </View>
          <Text style={styles.heroTitle}>blindfeed</Text>
          <Text style={styles.heroSub}>
            Content judged on merit, not identity.
          </Text>
        </View>

        {/* Your ID */}
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>Your anonymous ID</Text>
          <Text style={styles.idValue}>{tempUserId}</Text>
          <Text style={styles.idNote}>Resets every 7 days automatically</Text>
        </View>

        {/* Philosophy */}
        <Section title="Philosophy">
          <View style={styles.card}>
            <Text style={styles.philosophyText}>
              Modern social media rewards popularity, not quality. BlindFeed strips away all identity signals — no names, no profiles, no follower counts.{"\n\n"}
              Every post competes on equal ground. The best ideas win by merit alone.
            </Text>
          </View>
        </Section>

        {/* How it works */}
        <Section title="How it works">
          <RuleItem
            icon="eye-off"
            title="Fully anonymous"
            desc="No username, no profile, no history. Just your content."
          />
          <RuleItem
            icon="zap"
            title="Binary reactions"
            desc="Worth it or Skip — no likes, no counts, no pressure."
          />
          <RuleItem
            icon="clock"
            title="Ephemeral posts"
            desc="All posts expire in 48 hours. Nothing lingers forever."
          />
          <RuleItem
            icon="shuffle"
            title="Rotating identity"
            desc="Your temp ID resets every 7 days. A fresh start, always."
          />
        </Section>

        {/* Never section */}
        <Section title="BlindFeed will never have">
          <View style={styles.card}>
            {[
              "Followers or following",
              "Like counters",
              "User profiles",
              "Comment sections",
              "Messaging",
              "Verification badges",
            ].map((item) => (
              <View key={item} style={styles.neverRow}>
                <Feather name="x" size={14} color={Colors.skip} />
                <Text style={styles.neverText}>{item}</Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  idCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 4,
  },
  idLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  idValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: 2,
    marginVertical: 4,
  },
  idNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  philosophyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  ruleItem: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "flex-start",
  },
  ruleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  ruleContent: {
    flex: 1,
    gap: 3,
  },
  ruleTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  ruleDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    lineHeight: 20,
  },
  neverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  neverText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
