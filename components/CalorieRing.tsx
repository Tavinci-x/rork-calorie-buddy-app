import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

const TOTAL_SEGMENTS = 18;

export default function CalorieRing({ consumed, target }: CalorieRingProps) {
  const progress = Math.min(consumed / target, 1);
  const filledCount = Math.round(progress * TOTAL_SEGMENTS);
  const isOver = consumed > target;
  const fillColor = isOver ? Colors.calRingOver : Colors.calRing;
  const remaining = Math.max(0, target - consumed);

  return (
    <View style={styles.container}>
      <View style={styles.barBorder}>
        <View style={styles.barInner}>
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                { backgroundColor: i < filledCount ? fillColor : Colors.progressBg },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={styles.remainingText}>
        {isOver ? `${consumed - target} over!` : `${remaining} cal left`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%' as any,
  },
  barBorder: {
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    borderRadius: 4,
    padding: 3,
    backgroundColor: Colors.progressBg,
  },
  barInner: {
    flexDirection: 'row' as const,
    gap: 2,
  },
  segment: {
    flex: 1,
    height: 22,
    borderRadius: 2,
  },
  remainingText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'right' as const,
    fontWeight: '500' as const,
  },
});
