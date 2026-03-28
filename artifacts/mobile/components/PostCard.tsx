import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { Post } from "@/context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface PostCardProps {
  post: Post;
  reaction?: "worthit" | "skip";
  onReact: (type: "worthit" | "skip") => void;
  timeAgo: string;
}

export default function PostCard({
  post,
  reaction,
  onReact,
  timeAgo,
}: PostCardProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const hasReacted = !!reaction;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-8deg", "0deg", "8deg"],
    extrapolate: "clamp",
  });

  const worthItOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const skipOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !hasReacted,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy * 0.1 });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        triggerReaction("worthit");
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        triggerReaction("skip");
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const triggerReaction = (type: "worthit" | "skip") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        type === "worthit"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    }
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
    onReact(type);
  };

  const worthItPress = () => {
    if (hasReacted) return;
    triggerReaction("worthit");
  };

  const skipPress = () => {
    if (hasReacted) return;
    triggerReaction("skip");
  };

  const cardStyle = hasReacted
    ? undefined
    : {
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { rotate },
        ],
      };

  const totalReactions = post.worthItCount + post.skipCount;
  const worthItPercent =
    totalReactions > 0
      ? Math.round((post.worthItCount / totalReactions) * 100)
      : 0;

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(hasReacted ? {} : panResponder.panHandlers)}
    >
      {/* Worth it overlay */}
      <Animated.View
        style={[styles.reactionOverlay, styles.worthItOverlay, { opacity: worthItOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.overlayText}>WORTH IT</Text>
      </Animated.View>

      {/* Skip overlay */}
      <Animated.View
        style={[styles.reactionOverlay, styles.skipOverlay, { opacity: skipOpacity }]}
        pointerEvents="none"
      >
        <Text style={[styles.overlayText, { color: Colors.skip }]}>SKIP</Text>
      </Animated.View>

      {/* Post image */}
      {post.imageUri && (
        <Image source={{ uri: post.imageUri }} style={styles.postImage} />
      )}

      {/* Post content */}
      <View style={styles.contentArea}>
        <Text style={styles.postText}>{post.content}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <Text style={styles.anonId}>{post.tempUserId}</Text>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>

        {/* Reaction bar (shown after reacting) */}
        {hasReacted && totalReactions > 0 && (
          <View style={styles.reactionBar}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${worthItPercent}%` as any },
                ]}
              />
            </View>
            <View style={styles.reactionStats}>
              <Text style={styles.worthItStat}>{post.worthItCount} worth it</Text>
              <Text style={styles.skipStat}>{post.skipCount} skip</Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.skipBtn,
              hasReacted && reaction === "skip" && styles.activeSkip,
              hasReacted && reaction !== "skip" && styles.dimmedBtn,
            ]}
            onPress={skipPress}
            activeOpacity={0.8}
            disabled={hasReacted}
          >
            <Text
              style={[
                styles.actionBtnText,
                styles.skipText,
                hasReacted && reaction !== "skip" && styles.dimmedText,
              ]}
            >
              Skip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.worthItBtn,
              hasReacted && reaction === "worthit" && styles.activeWorthIt,
              hasReacted && reaction !== "worthit" && styles.dimmedBtn,
            ]}
            onPress={worthItPress}
            activeOpacity={0.8}
            disabled={hasReacted}
          >
            <Text
              style={[
                styles.actionBtnText,
                styles.worthItText,
                hasReacted && reaction !== "worthit" && styles.dimmedText,
              ]}
            >
              Worth it
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reactionOverlay: {
    position: "absolute",
    top: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
  },
  worthItOverlay: {
    right: 20,
    borderColor: Colors.worthIt,
  },
  skipOverlay: {
    left: 20,
    borderColor: Colors.skip,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.worthIt,
    letterSpacing: 1.5,
  },
  postImage: {
    width: "100%",
    height: 200,
  },
  contentArea: {
    padding: 20,
    paddingBottom: 12,
  },
  postText: {
    fontSize: 18,
    color: Colors.text,
    lineHeight: 28,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  anonId: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  reactionBar: {
    marginBottom: 14,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.skipBg,
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.worthIt,
    borderRadius: 2,
  },
  reactionStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  worthItStat: {
    fontSize: 11,
    color: Colors.worthIt,
    fontFamily: "Inter_500Medium",
  },
  skipStat: {
    fontSize: 11,
    color: Colors.skip,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  worthItBtn: {
    backgroundColor: Colors.worthItBg,
    borderColor: Colors.worthIt,
  },
  skipBtn: {
    backgroundColor: Colors.skipBg,
    borderColor: Colors.skip,
  },
  activeWorthIt: {
    backgroundColor: Colors.worthIt,
  },
  activeSkip: {
    backgroundColor: Colors.skip,
  },
  dimmedBtn: {
    opacity: 0.35,
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  worthItText: {
    color: Colors.worthIt,
  },
  skipText: {
    color: Colors.skip,
  },
  dimmedText: {
    opacity: 0.6,
  },
});
