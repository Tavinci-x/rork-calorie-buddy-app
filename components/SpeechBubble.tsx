import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '@/constants/colors';

interface SpeechBubbleProps {
  message: string;
}

export default function SpeechBubble({ message }: SpeechBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [message, fadeAnim, scaleAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.bubble}>
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
        <Text style={styles.text}>{message}</Text>
      </View>
      <View style={styles.tailOuter} />
      <View style={styles.tailInner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  bubble: {
    backgroundColor: Colors.card,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 260,
    position: 'relative' as const,
  },
  cornerTL: {
    position: 'absolute' as const,
    top: -1,
    left: -1,
    width: 4,
    height: 4,
    backgroundColor: Colors.cardBorder,
  },
  cornerTR: {
    position: 'absolute' as const,
    top: -1,
    right: -1,
    width: 4,
    height: 4,
    backgroundColor: Colors.cardBorder,
  },
  cornerBL: {
    position: 'absolute' as const,
    bottom: -1,
    left: -1,
    width: 4,
    height: 4,
    backgroundColor: Colors.cardBorder,
  },
  cornerBR: {
    position: 'absolute' as const,
    bottom: -1,
    right: -1,
    width: 4,
    height: 4,
    backgroundColor: Colors.cardBorder,
  },
  text: {
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center' as const,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  tailOuter: {
    width: 12,
    height: 12,
    backgroundColor: Colors.cardBorder,
    transform: [{ rotate: '45deg' }],
    marginTop: -7,
  },
  tailInner: {
    width: 8,
    height: 8,
    backgroundColor: Colors.card,
    transform: [{ rotate: '45deg' }],
    marginTop: -11,
  },
});
