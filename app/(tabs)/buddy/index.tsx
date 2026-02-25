import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Flame,
  Smile,
  Frown,
  Moon,
  Zap,
  Coffee,
  Meh,
  Droplets,
  Drumstick,
  UtensilsCrossed,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import BuddyMascot from '@/components/BuddyMascot';
import SpeechBubble from '@/components/SpeechBubble';
import { useApp } from '@/providers/AppProvider';
import { getRandomMessage } from '@/constants/buddy';
import { getCurrentHour } from '@/utils/helpers';
import type { BuddyMood } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUDDY_SIZE = Math.min(SCREEN_WIDTH * 0.7, 320);

const MOOD_CONFIG: Record<BuddyMood, { label: string; color: string; bgColor: string; icon: React.ElementType; }> = {
  happy: { label: 'Happy', color: '#34C759', bgColor: '#E8F5E9', icon: Smile },
  excited: { label: 'Pumped', color: '#FF9500', bgColor: '#FFF3E0', icon: Zap },
  hungry: { label: 'Hungry', color: '#FF3B30', bgColor: '#FFEBEE', icon: Coffee },
  sad: { label: 'Worried', color: '#8E8E93', bgColor: '#F2F2F7', icon: Frown },
  sleeping: { label: 'Sleeping', color: '#5B9BD5', bgColor: '#EEF4FB', icon: Moon },
  celebrating: { label: 'Celebrating', color: '#FF9500', bgColor: '#FFF3E0', icon: Zap },
  neutral: { label: 'Watching', color: '#8E8E93', bgColor: '#F2F2F7', icon: Meh },
};

interface ReminderItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  status: 'done' | 'warning' | 'urgent';
  action?: string;
  route?: string;
}

export default function BuddyScreen() {
  const router = useRouter();
  const {
    profile, todayMeals, todayCalories, todayProtein, buddyStage, buddyMood, streak, isReady,
  } = useApp();

  const floatAnim = useRef(new Animated.Value(0)).current;
  const moodFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!isReady) return;

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 6, duration: 2800, useNativeDriver: true }),
      ])
    );
    float.start();

    Animated.parallel([
      Animated.timing(moodFade, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 500, delay: 300, useNativeDriver: true }),
    ]).start();

    return () => { float.stop(); };
  }, [isReady, floatAnim, moodFade, cardSlide]);

  const hour = getCurrentHour();
  const proteinTarget = useMemo(() => Math.round(profile.currentWeightKg * 1.6), [profile.currentWeightKg]);
  const proteinRatio = proteinTarget > 0 ? todayProtein / proteinTarget : 0;
  const calorieRatio = profile.dailyCalorieTarget > 0
    ? todayCalories / profile.dailyCalorieTarget : 0;

  const buddyMessage = useMemo(() => {
    if (!isReady || !profile.onboardingComplete) return '';
    if (buddyMood === 'sleeping') return getRandomMessage('sleeping');
    if (buddyMood === 'sad') return getRandomMessage('returning');
    if (streak >= 3) return getRandomMessage('streak', { streak: streak.toString() });
    if (calorieRatio >= 0.9 && calorieRatio <= 1.1) return getRandomMessage('target_met');
    if (calorieRatio > 1.1) return getRandomMessage('over_target');
    if (todayMeals.length > 0 && proteinRatio < 0.5) return getRandomMessage('low_protein');
    if (todayMeals.length > 0) return getRandomMessage('meal_logged');
    if (hour >= 18) return getRandomMessage('evening_no_meals');
    if (hour >= 12) return getRandomMessage('afternoon_no_meals');
    if (hour < 12) return getRandomMessage('morning_no_meals');
    return getRandomMessage('default');
  }, [buddyMood, streak, calorieRatio, proteinRatio, todayMeals.length, hour, isReady, profile.onboardingComplete]);

  const reminders = useMemo<ReminderItem[]>(() => {
    const items: ReminderItem[] = [];

    const mealsLogged = todayMeals.length;
    const hasBreakfast = todayMeals.some(m => m.mealType === 'breakfast');
    const hasLunch = todayMeals.some(m => m.mealType === 'lunch');
    const hasDinner = todayMeals.some(m => m.mealType === 'dinner');

    if (mealsLogged === 0) {
      items.push({
        id: 'no-meals',
        icon: UtensilsCrossed,
        iconColor: '#FF3B30',
        iconBg: '#FFEBEE',
        title: 'No meals logged today',
        subtitle: 'Your cat is getting hangry. Go eat and log it!',
        status: 'urgent',
        action: 'Log meal',
        route: '/log-meal',
      });
    } else {
      const missingMeals: string[] = [];
      if (!hasBreakfast && hour >= 10) missingMeals.push('breakfast');
      if (!hasLunch && hour >= 14) missingMeals.push('lunch');
      if (!hasDinner && hour >= 19) missingMeals.push('dinner');

      if (missingMeals.length > 0) {
        items.push({
          id: 'missing-meals',
          icon: UtensilsCrossed,
          iconColor: '#FF9500',
          iconBg: '#FFF3E0',
          title: `Missing: ${missingMeals.join(', ')}`,
          subtitle: `You skipped ${missingMeals.length === 1 ? 'a meal' : 'meals'}. Log it if you ate!`,
          status: 'warning',
          action: 'Log meal',
          route: '/log-meal',
        });
      } else {
        items.push({
          id: 'meals-good',
          icon: UtensilsCrossed,
          iconColor: '#34C759',
          iconBg: '#E8F5E9',
          title: `${mealsLogged} meal${mealsLogged > 1 ? 's' : ''} logged`,
          subtitle: 'Good job keeping up with your logging!',
          status: 'done',
        });
      }
    }

    if (proteinRatio < 0.5) {
      items.push({
        id: 'protein-low',
        icon: Drumstick,
        iconColor: '#FF3B30',
        iconBg: '#FFEBEE',
        title: `Protein: ${Math.round(todayProtein)}g / ${proteinTarget}g`,
        subtitle: 'Way behind on protein! Eat something high-protein NOW.',
        status: 'urgent',
      });
    } else if (proteinRatio < 0.8) {
      items.push({
        id: 'protein-mid',
        icon: Drumstick,
        iconColor: '#FF9500',
        iconBg: '#FFF3E0',
        title: `Protein: ${Math.round(todayProtein)}g / ${proteinTarget}g`,
        subtitle: 'Getting there, but you need more protein today.',
        status: 'warning',
      });
    } else {
      items.push({
        id: 'protein-good',
        icon: Drumstick,
        iconColor: '#34C759',
        iconBg: '#E8F5E9',
        title: `Protein: ${Math.round(todayProtein)}g / ${proteinTarget}g`,
        subtitle: 'Nice! You\'re hitting your protein goal.',
        status: 'done',
      });
    }

    items.push({
      id: 'hydration',
      icon: Droplets,
      iconColor: '#5B9BD5',
      iconBg: '#EEF4FB',
      title: 'Stay hydrated',
      subtitle: 'Have you had water recently? Go drink a glass right now!',
      status: 'warning',
    });

    if (calorieRatio < 0.5 && hour >= 14) {
      items.push({
        id: 'calories-low',
        icon: AlertTriangle,
        iconColor: '#FF3B30',
        iconBg: '#FFEBEE',
        title: `Calories: ${todayCalories} / ${profile.dailyCalorieTarget}`,
        subtitle: 'You\'re way under your calorie target. Eat more!',
        status: 'urgent',
      });
    } else if (calorieRatio >= 0.9 && calorieRatio <= 1.1) {
      items.push({
        id: 'calories-good',
        icon: CheckCircle2,
        iconColor: '#34C759',
        iconBg: '#E8F5E9',
        title: `Calories: ${todayCalories} / ${profile.dailyCalorieTarget}`,
        subtitle: 'Right on target! Your cat is proud.',
        status: 'done',
      });
    }

    return items;
  }, [todayMeals, todayCalories, todayProtein, proteinTarget, proteinRatio, calorieRatio, hour, profile.dailyCalorieTarget]);

  const moodInfo = MOOD_CONFIG[buddyMood] ?? MOOD_CONFIG.neutral;
  const MoodIcon = moodInfo.icon;

  const handleReminderPress = useCallback((item: ReminderItem) => {
    if (item.route) {
      router.push(item.route as never);
    }
  }, [router]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Buddy</Text>
          <View style={styles.headerRight}>
            <View style={[styles.moodChip, { backgroundColor: moodInfo.bgColor }]}>
              <MoodIcon size={14} color={moodInfo.color} />
              <Text style={[styles.moodChipText, { color: moodInfo.color }]}>{moodInfo.label}</Text>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Flame size={14} color={Colors.streakFire} />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.buddyArea}>
            <SpeechBubble message={buddyMessage} />
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
              <BuddyMascot
                stage={buddyStage}
                mood={buddyMood}
                color={profile.buddyColor}
                size={BUDDY_SIZE}
                goalType={profile.goalType}
                imageBase64={profile.buddyImageBase64}
              />
            </Animated.View>
          </View>

          <Animated.View style={[styles.remindersSection, { opacity: moodFade, transform: [{ translateY: cardSlide }] }]}>
            <Text style={styles.remindersTitle}>Today's Checklist</Text>
            <Text style={styles.remindersSubtitle}>Your cat is keeping tabs on you</Text>

            {reminders.map((item) => {
              const ItemIcon = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.reminderCard,
                    item.status === 'urgent' && styles.reminderCardUrgent,
                  ]}
                  onPress={() => handleReminderPress(item)}
                  activeOpacity={item.route ? 0.7 : 1}
                  testID={`reminder-${item.id}`}
                >
                  <View style={[styles.reminderIcon, { backgroundColor: item.iconBg }]}>
                    <ItemIcon size={20} color={item.iconColor} />
                  </View>
                  <View style={styles.reminderContent}>
                    <Text style={styles.reminderTitle}>{item.title}</Text>
                    <Text style={styles.reminderSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.status === 'done' ? (
                    <View style={styles.checkBadge}>
                      <CheckCircle2 size={18} color="#34C759" />
                    </View>
                  ) : item.route ? (
                    <ChevronRight size={18} color={Colors.textMuted} />
                  ) : (
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: item.status === 'urgent' ? '#FF3B30' : '#FF9500' },
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  moodChip: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  moodChipText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  streakBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.streakBg,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.streakFire,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  buddyArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  remindersSection: {
    paddingHorizontal: 20,
    gap: 10,
  },
  remindersTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 0,
  },
  remindersSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  reminderCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  reminderCardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  reminderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  checkBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bottomSpacer: {
    height: 20,
  },
});
