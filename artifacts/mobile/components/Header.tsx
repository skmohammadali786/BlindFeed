import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

interface HeaderProps {
  title?: string;
  userId?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
}

export default function Header({ title = "blindfeed", userId, right, left }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.header, { paddingTop: topPadding }]}>
      <View style={styles.inner}>
        <View style={styles.leftSlot}>{left}</View>
        <View style={styles.center}>
          <Text style={styles.title}>{title}</Text>
          {userId && <Text style={styles.userId}>{userId}</Text>}
        </View>
        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inner: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  leftSlot: {
    flex: 1,
    alignItems: "flex-start",
  },
  center: {
    flex: 2,
    alignItems: "center",
  },
  rightSlot: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  userId: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
    letterSpacing: 0.5,
  },
});
