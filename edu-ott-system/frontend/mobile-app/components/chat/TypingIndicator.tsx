import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';

// ============================================================
// TypingIndicator - Hiệu ứng 3 chấm nhảy khi ai đó đang gõ
// ============================================================

interface TypingIndicatorProps {
  userName?: string;
  isVisible: boolean;
  text?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName, isVisible, text }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isVisible) return;

    const createBounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    const anim1 = createBounce(dot1, 0);
    const anim2 = createBounce(dot2, 150);
    const anim3 = createBounce(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [isVisible, dot1, dot2, dot3]);

  if (!isVisible) return null;

  const dotStyle = 'w-1.5 h-1.5 rounded-full bg-gray-400 mx-0.5';

  return (
    <View className="flex-row items-center px-4 py-1.5">
      <View className="flex-row items-center bg-gray-100 rounded-2xl px-3 py-2">
        <Animated.View
          className={dotStyle}
          style={{ transform: [{ translateY: dot1 }] }}
        />
        <Animated.View
          className={dotStyle}
          style={{ transform: [{ translateY: dot2 }] }}
        />
        <Animated.View
          className={dotStyle}
          style={{ transform: [{ translateY: dot3 }] }}
        />
      </View>
      {text ? (
        <Text className="text-gray-400 text-xs ml-2 italic">
          {text}
        </Text>
      ) : userName ? (
        <Text className="text-gray-400 text-xs ml-2 italic">
          {userName} đang nhập...
        </Text>
      ) : null}
    </View>
  );
};
