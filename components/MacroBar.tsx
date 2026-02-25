import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Colors from '@/constants/colors';

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  color: string;
  bgColor: string;
  icon: string;
}

export default function MacroBar({ label, value, target, color, bgColor, icon }: MacroBarProps) {
  const size = 52;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={styles.value}>
        <Text style={styles.valueBold}>{Math.round(value)}</Text>
        <Text style={styles.target}> /{target}g</Text>
      </Text>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.ringContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.progressTrack}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
  },
  value: {
    fontSize: 14,
  },
  valueBold: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  target: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ringContainer: {
    alignSelf: 'center',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
});
