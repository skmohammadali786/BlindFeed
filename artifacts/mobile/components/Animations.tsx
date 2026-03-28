import React, { useEffect } from "react";
import {
  TouchableOpacity,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export function ScreenTransition({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeIn.duration(320)} style={[{ flex: 1 }, style]}>
      {children}
    </Animated.View>
  );
}

export function FadeSlide({
  children,
  delay = 0,
  from = "bottom",
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: "bottom" | "top";
  style?: StyleProp<ViewStyle>;
}) {
  const Anim = from === "top" ? FadeInUp : FadeInDown;
  return (
    <Animated.View
      entering={Anim.delay(delay).duration(450).springify().damping(18)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function AnimatedListItem({
  children,
  index,
  style,
}: {
  children: React.ReactNode;
  index: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 65, 500))
        .duration(380)
        .springify()
        .damping(16)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function BounceFab({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={ZoomIn.delay(250).duration(450).springify().damping(11)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function PulseView({
  children,
  style,
  speed = 1600,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  speed?: number;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: speed / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: speed / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

export function GlowPulse({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.55, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

export function AnimatedPressable({
  children,
  style,
  onPress,
  onLongPress,
  disabled,
  scaleTo = 0.94,
  activeOpacity = 0.9,
  ...rest
}: TouchableOpacityProps & { scaleTo?: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animStyle, style as StyleProp<ViewStyle>]}>
      <TouchableOpacity
        onPressIn={() => {
          scale.value = withSpring(scaleTo, { damping: 12, stiffness: 350 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 10, stiffness: 200 });
        }}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        activeOpacity={activeOpacity}
        style={{ width: "100%" }}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function useReactionAnim() {
  const scale = useSharedValue(1);
  const trigger = () => {
    scale.value = withSequence(
      withSpring(1.35, { damping: 5, stiffness: 500 }),
      withSpring(0.92, { damping: 8, stiffness: 350 }),
      withSpring(1, { damping: 10, stiffness: 250 }),
    );
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { style, trigger };
}

export function useShimmer() {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }),
        withTiming(0.3, { duration: 700, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
