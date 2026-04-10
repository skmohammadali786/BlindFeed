import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export default function EmptyFeed() {
  return (
    <View style={styles.container}>
      <Feather name="eye-off" size={48} color={Colors.textTertiary} />
      <Text style={styles.title}>Nothing here yet</Text>
      <Text style={styles.subtitle}>
        Be the first to share something worth reading.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 18,
    fontFamily: "JetBrainsMono_600SemiBold",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "JetBrainsMono_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 22,
  },
});
