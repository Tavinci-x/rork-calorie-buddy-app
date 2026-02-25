import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Line, Circle as SvgCircle, Polyline, Text as SvgText } from 'react-native-svg';
import { TrendingUp, Flame, Calendar, Target, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import BuddyMascot from '@/components/BuddyMascot';
import { useApp } from '@/providers/AppProvider';
import { daysBetween, formatDate, getDateNDaysAgo } from '@/utils/helpers';
import { type BuddyStage } from '@/types';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const CHART_PADDING = 40;

export default function ProgressScreen() {
  const router = useRouter();
  const { profile, weights, mealsByDate, streak, progress, buddyStage } = useApp();
  const hasCustomImage = !!profile.buddyImageBase64;

  const weightChartData = useMemo(() => {
    if (weights.length === 0) return null;
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    const last10 = sorted.slice(-10);
    if (last10.length < 2) return null;

    const vals = last10.map(w => w.weightKg);
    const minW = Math.min(...vals) - 1;
    const maxW = Math.max(...vals) + 1;
    const range = maxW - minW || 1;

    const points = last10.map((w, i) => {
      const x = CHART_PADDING + (i / (last10.length - 1)) * (CHART_WIDTH - CHART_PADDING * 2);
      const y = CHART_HEIGHT - CHART_PADDING - ((w.weightKg - minW) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
      return { x, y, weight: w.weightKg, date: w.date };
    });

    return { points, minW, maxW };
  }, [weights]);

  const weeklyAverages = useMemo(() => {
    const weeks: { label: string; avg: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      let total = 0;
      let days = 0;
      for (let d = 0; d < 7; d++) {
        const date = getDateNDaysAgo(w * 7 + d);
        const dayMeals = mealsByDate[date];
        if (dayMeals && dayMeals.length > 0) {
          total += dayMeals.reduce((s, m) => s + m.calories, 0);
          days++;
        }
      }
      weeks.push({
        label: w === 0 ? 'This wk' : `${w}w ago`,
        avg: days > 0 ? Math.round(total / days) : 0,
      });
    }
    return weeks;
  }, [mealsByDate]);

  const maxWeeklyAvg = Math.max(...weeklyAverages.map(w => w.avg), 1);

  const daysTracked = useMemo(() => {
    return Object.keys(mealsByDate).length;
  }, [mealsByDate]);

  const weightChange = useMemo(() => {
    if (weights.length === 0) return 0;
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1].weightKg - profile.startWeightKg;
  }, [weights, profile.startWeightKg]);

  const stages: BuddyStage[] = [1, 2, 3, 4, 5];
  const stageLabels = profile.goalType === 'gain'
    ? ['Skinny', 'Slim', 'Average', 'Strong', 'Buff']
    : ['Round', 'Chunky', 'Average', 'Fit', 'Athletic'];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>Progress</Text>

          <View style={styles.topCards}>
            <View style={styles.streakCard}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakValue}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
              <View style={styles.weekDots}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <View key={i} style={styles.weekDot}>
                    <Text style={[styles.weekDotText, i < streak && styles.weekDotActive]}>{d}</Text>
                    <View style={[styles.weekDotCircle, i < streak && styles.weekDotCircleActive]} />
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.statsCard}>
              <View style={styles.statRow}>
                <Calendar size={16} color={Colors.textSecondary} />
                <Text style={styles.statLabel}>Days Tracked</Text>
                <Text style={styles.statValue}>{daysTracked}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <Target size={16} color={Colors.textSecondary} />
                <Text style={styles.statLabel}>Goal Progress</Text>
                <Text style={styles.statValue}>{Math.round(progress)}%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <TrendingUp size={16} color={Colors.textSecondary} />
                <Text style={styles.statLabel}>Weight Change</Text>
                <Text style={[styles.statValue, weightChange !== 0 && (
                  (profile.goalType === 'lose' && weightChange < 0) || (profile.goalType === 'gain' && weightChange > 0)
                    ? styles.statGreen : styles.statRed
                )]}>
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current Weight</Text>
              <TouchableOpacity
                style={styles.logWeightBtn}
                onPress={() => {
                  router.push('/log-weight' as any);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.logWeightText}>Log weight →</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.currentWeight}>{profile.currentWeightKg} kg</Text>
            <View style={styles.weightProgressBar}>
              <View style={[styles.weightProgressFill, { width: `${Math.min(100, progress)}%` }]} />
            </View>
            <View style={styles.weightLabels}>
              <Text style={styles.weightLabel}>Start: {profile.startWeightKg} kg</Text>
              <Text style={styles.weightLabel}>Goal: {profile.goalWeightKg} kg</Text>
            </View>
            {profile.targetDate && (
              <Text style={styles.goalDate}>At your goal by {formatDate(profile.targetDate)}.</Text>
            )}
          </View>

          {weightChartData && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight Progress</Text>
              <View style={styles.chartRow}>
                <Text style={styles.chartBadge}>📊 {Math.round(progress)}% of goal</Text>
              </View>
              <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                <Line x1={CHART_PADDING} y1={CHART_HEIGHT - CHART_PADDING} x2={CHART_WIDTH - CHART_PADDING} y2={CHART_HEIGHT - CHART_PADDING} stroke={Colors.progressTrack} strokeWidth={1} />
                <Polyline
                  points={weightChartData.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={Colors.text}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
                {weightChartData.points.map((p, i) => (
                  <SvgCircle key={i} cx={p.x} cy={p.y} r={4} fill={Colors.text} stroke={Colors.white} strokeWidth={2} />
                ))}
                {weightChartData.points.filter((_, i) => i === 0 || i === weightChartData.points.length - 1).map((p, i) => (
                  <SvgText key={`label-${i}`} x={p.x} y={CHART_HEIGHT - 10} fill={Colors.textSecondary} fontSize={10} textAnchor="middle">
                    {formatDate(p.date)}
                  </SvgText>
                ))}
                <SvgText x={10} y={CHART_PADDING} fill={Colors.textSecondary} fontSize={10}>
                  {weightChartData.maxW.toFixed(0)}
                </SvgText>
                <SvgText x={10} y={CHART_HEIGHT - CHART_PADDING} fill={Colors.textSecondary} fontSize={10}>
                  {weightChartData.minW.toFixed(0)}
                </SvgText>
              </Svg>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Average Calories</Text>
            <View style={styles.barChartRow}>
              {weeklyAverages.map((w, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${w.avg > 0 ? Math.max(8, (w.avg / maxWeeklyAvg) * 100) : 0}%`,
                          backgroundColor: i === weeklyAverages.length - 1 ? Colors.accent : Colors.progressTrack,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{w.avg > 0 ? w.avg : '-'}</Text>
                  <Text style={styles.barLabel}>{w.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Buddy Evolution</Text>
            <View style={styles.evolutionRow}>
              {stages.map(s => (
                <View key={s} style={styles.evolutionItem}>
                  <View style={[styles.evolutionBubble, s === buddyStage && styles.evolutionBubbleActive, s < buddyStage && styles.evolutionBubbleCompleted]}>
                    <BuddyMascot
                      stage={s}
                      mood={s === buddyStage ? 'happy' : 'neutral'}
                      color={profile.buddyColor}
                      size={44}
                      goalType={profile.goalType}
                      imageBase64={profile.buddyImageBase64}
                    />
                  </View>
                  <Text style={[styles.evolutionLabel, s === buddyStage && styles.evolutionLabelActive]}>
                    {stageLabels[s - 1]}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 20,
  },
  topCards: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 12,
  },
  streakCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  streakEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  streakLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  weekDots: {
    flexDirection: 'row' as const,
    gap: 4,
  },
  weekDot: {
    alignItems: 'center',
    gap: 3,
  },
  weekDotText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  weekDotActive: {
    color: Colors.streakFire,
  },
  weekDotCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.progressTrack,
  },
  weekDotCircleActive: {
    backgroundColor: Colors.streakFire,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statGreen: {
    color: Colors.success,
  },
  statRed: {
    color: Colors.accent,
  },
  statDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  logWeightBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logWeightText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  currentWeight: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  weightProgressBar: {
    height: 6,
    backgroundColor: Colors.progressTrack,
    borderRadius: 3,
    overflow: 'hidden' as const,
    marginBottom: 8,
  },
  weightProgressFill: {
    height: 6,
    backgroundColor: Colors.text,
    borderRadius: 3,
  },
  weightLabels: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
  },
  weightLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  goalDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  chartRow: {
    flexDirection: 'row' as const,
    marginBottom: 12,
    marginTop: -8,
  },
  chartBadge: {
    fontSize: 13,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden' as const,
  },
  barChartRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    gap: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    height: 100,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    minHeight: 4,
  },
  barValue: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  evolutionRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  evolutionItem: {
    alignItems: 'center',
    flex: 1,
  },
  evolutionBubble: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
  },
  evolutionBubbleActive: {
    borderWidth: 2,
    borderColor: Colors.text,
  },
  evolutionBubbleCompleted: {
    backgroundColor: Colors.successLight,
  },
  evolutionLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  evolutionLabelActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  bottomSpacer: {
    height: 40,
  },
});
