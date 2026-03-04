import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  color: string;
  bgColor: string;
  icon: string;
}

const SEGMENTS = 12;

export default function MacroBar({ label, value, target, color, bgColor, icon }: MacroBarProps) {
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const filledCount = Math.round(progress * SEGMENTS);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.value}>
          <Text style={styles.valueBold}>{Math.round(value)}</Text>
          <Text style={styles.target}>/{target}g</Text>
        </Text>
      </View>
      <View style={[styles.barBorder, { borderColor: bgColor }]}>
        <View style={styles.barInner}>
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                { backgroundColor: i < filledCount ? color : bgColor },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 5,
    gap: 4,
  },
  icon: {
    fontSize: 14,
  },
  value: {
    fontSize: 12,
  },
  valueBold: {
    fontWeight: '700' as const,
    color: Colors.text,
    fontSize: 14,
  },
  target: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  label: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  barBorder: {
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: 3,
    padding: 2,
    backgroundColor: Colors.progressBg,
  },
  barInner: {
    flexDirection: 'row' as const,
    gap: 1.5,
  },
  segment: {
    flex: 1,
    height: 12,
    borderRadius: 1.5,
  },
});
