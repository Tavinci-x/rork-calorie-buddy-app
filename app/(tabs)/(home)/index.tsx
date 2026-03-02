import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform, ActivityIndicator, Modal, Pressable, Dimensions } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Camera, ScanBarcode, X, Search, UtensilsCrossed } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import BuddyMascot from '@/components/BuddyMascot';
import SpeechBubble from '@/components/SpeechBubble';
import CalorieRing from '@/components/CalorieRing';
import MacroBar from '@/components/MacroBar';
import { useApp } from '@/providers/AppProvider';
import { getRandomMessage } from '@/constants/buddy';
import { getCurrentHour } from '@/utils/helpers';
import { type MealType } from '@/types';

function getWeekDays() {
  const today = new Date();
  const days: { label: string; date: number; isToday: boolean; dateStr: string; hasData: boolean }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push({
      label: dayNames[d.getDay()],
      date: d.getDate(),
      isToday: i === 0,
      dateStr: d.toISOString().split('T')[0],
      hasData: false,
    });
  }
  return days;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function HomeScreen() {
  const router = useRouter();
  const {
    profile, todayMeals, todayCalories, todayProtein, todayCarbs, todayFat,
    buddyStage, buddyMood, streak, deleteMeal, isReady, mealsByDate,
  } = useApp();

  const fabAnim = useRef(new Animated.Value(0)).current;
  const [showLogPopup, setShowLogPopup] = useState<boolean>(false);
  const popupAnim = useRef(new Animated.Value(0)).current;
  const popupScaleAnim = useRef(new Animated.Value(0.9)).current;

  const openLogPopup = useCallback(() => {
    setShowLogPopup(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.timing(popupAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(popupScaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [popupAnim, popupScaleAnim]);

  const closeLogPopup = useCallback(() => {
    Animated.timing(popupAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setShowLogPopup(false);
      popupScaleAnim.setValue(0.9);
    });
  }, [popupAnim, popupScaleAnim]);

  const handleLogOption = useCallback((route: string) => {
    closeLogPopup();
    setTimeout(() => {
      router.push(route as any);
    }, 160);
  }, [closeLogPopup, router]);

  useEffect(() => {
    if (isReady && profile.onboardingComplete) {
      Animated.spring(fabAnim, { toValue: 1, friction: 6, delay: 300, useNativeDriver: true }).start();
    }
  }, [fabAnim, isReady, profile.onboardingComplete]);

  const buddyMessage = useMemo(() => {
    if (!isReady || !profile.onboardingComplete) return '';
    const hour = getCurrentHour();
    if (buddyMood === 'sleeping') return getRandomMessage('sleeping');
    if (buddyMood === 'sad') return getRandomMessage('returning');
    if (streak >= 3) return getRandomMessage('streak', { streak: streak.toString() });
    if (todayCalories > 0 && Math.abs(todayCalories - profile.dailyCalorieTarget) / profile.dailyCalorieTarget <= 0.1) {
      return getRandomMessage('target_met');
    }
    if (todayMeals.length > 0) return getRandomMessage('meal_logged');
    if (hour < 12) return getRandomMessage('morning_no_meals');
    if (todayMeals.length === 0 && hour >= 12) return getRandomMessage('afternoon_no_meals');
    return getRandomMessage('default');
  }, [buddyMood, streak, todayCalories, todayMeals.length, profile.dailyCalorieTarget, isReady, profile.onboardingComplete]);

  const weekDays = useMemo(() => {
    const days = getWeekDays();
    return days.map(d => ({
      ...d,
      hasData: !!(mealsByDate[d.dateStr] && mealsByDate[d.dateStr].length > 0),
    }));
  }, [mealsByDate]);

  const mealsByType = useMemo(() => {
    const grouped: Record<MealType, typeof todayMeals> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    todayMeals.forEach(m => {
      grouped[m.mealType].push(m);
    });
    return grouped;
  }, [todayMeals]);

  const proteinTarget = Math.round(profile.dailyCalorieTarget * 0.3 / 4);
  const carbsTarget = Math.round(profile.dailyCalorieTarget * 0.45 / 4);
  const fatTarget = Math.round(profile.dailyCalorieTarget * 0.25 / 9);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.text} />
      </View>
    );
  }

  if (!profile.onboardingComplete) {
    return <Redirect href={"/onboarding" as any} />;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.appName}>MeowCal</Text>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekRow} contentContainerStyle={styles.weekRowContent}>
            {weekDays.map((day, i) => (
              <View key={i} style={styles.weekDayCol}>
                <Text style={[styles.weekDayLabel, day.isToday && styles.weekDayLabelToday]}>{day.label}</Text>
                <View style={[
                  styles.weekDayCircle,
                  day.isToday && styles.weekDayCircleToday,
                  day.hasData && !day.isToday && styles.weekDayCircleHasData,
                ]}>
                  <Text style={[
                    styles.weekDayDate,
                    day.isToday && styles.weekDayDateToday,
                    day.hasData && !day.isToday && styles.weekDayDateHasData,
                  ]}>{day.date}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.buddySection}>
            <SpeechBubble message={buddyMessage} />
            <BuddyMascot
              stage={buddyStage}
              mood={buddyMood}
              color={profile.buddyColor}
              size={160}
              goalType={profile.goalType}
              imageBase64={profile.buddyImageBase64}
            />
          </View>

          <View style={styles.calorieCard}>
            <View style={styles.calorieCardInner}>
              <View style={styles.calorieInfo}>
                <Text style={styles.calorieConsumed}>
                  <Text style={styles.calorieBig}>{todayCalories}</Text>
                  <Text style={styles.calorieTarget}> /{profile.dailyCalorieTarget}</Text>
                </Text>
                <Text style={styles.calorieLabel}>Calories eaten</Text>
              </View>
              <CalorieRing consumed={todayCalories} target={profile.dailyCalorieTarget} size={100} strokeWidth={8} />
            </View>
          </View>

          <View style={styles.macroRow}>
            <MacroBar
              label="Protein eaten"
              value={todayProtein}
              target={proteinTarget}
              color={Colors.protein}
              bgColor={Colors.proteinBg}
              icon="🍖"
            />
            <View style={styles.macroGap} />
            <MacroBar
              label="Carbs eaten"
              value={todayCarbs}
              target={carbsTarget}
              color={Colors.carbs}
              bgColor={Colors.carbsBg}
              icon="🌾"
            />
            <View style={styles.macroGap} />
            <MacroBar
              label="Fat eaten"
              value={todayFat}
              target={fatTarget}
              color={Colors.fat}
              bgColor={Colors.fatBg}
              icon="🥑"
            />
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => {
                router.push('/scan-food' as any);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.quickActionIcon}>
                <Camera size={20} color={Colors.text} />
              </View>
              <Text style={styles.quickActionText}>Scan Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => {
                router.push('/barcode-scanner' as any);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.quickActionIcon}>
                <ScanBarcode size={20} color={Colors.text} />
              </View>
              <Text style={styles.quickActionText}>Barcode</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mealsSection}>
            <Text style={styles.sectionTitle}>Recently uploaded</Text>
            {todayMeals.length === 0 ? (
              <TouchableOpacity style={styles.emptyMeals} onPress={openLogPopup} activeOpacity={0.7}>
                <Text style={styles.emptyText}>Tap to add your first meal of the day</Text>
              </TouchableOpacity>
            ) : (
              (['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                const typeMeals = mealsByType[type];
                if (typeMeals.length === 0) return null;
                return (
                  <View key={type} style={styles.mealGroup}>
                    <Text style={styles.mealGroupTitle}>{MEAL_LABELS[type]}</Text>
                    {typeMeals.map(meal => (
                      <View key={meal.id} style={styles.mealItem}>
                        <View style={styles.mealInfo}>
                          <Text style={styles.mealName}>{meal.name}</Text>
                          <Text style={styles.mealMeta}>
                            {meal.calories} cal
                            {meal.proteinG ? ` · ${meal.proteinG}g P` : ''}
                            {meal.carbsG ? ` · ${meal.carbsG}g C` : ''}
                            {meal.fatG ? ` · ${meal.fatG}g F` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => { deleteMeal(meal.id); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                          style={styles.deleteBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={16} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabAnim }] }]}>
          <TouchableOpacity
            style={styles.fab}
            onPress={openLogPopup}
            activeOpacity={0.85}
            testID="log-meal-fab"
          >
            <Plus size={26} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      <Modal visible={showLogPopup} transparent animationType="none" onRequestClose={closeLogPopup}>
        <Animated.View style={[styles.popupOverlay, { opacity: popupAnim }]}>
          <Pressable style={styles.popupBackdrop} onPress={closeLogPopup} />
          <Animated.View style={[styles.popupContainer, { opacity: popupAnim, transform: [{ scale: popupScaleAnim }] }]}>
            <View style={styles.popupGrid}>
              <TouchableOpacity style={styles.popupItem} onPress={() => handleLogOption('/log-meal')} activeOpacity={0.7}>
                <View style={styles.popupIconWrap}>
                  <UtensilsCrossed size={24} color={Colors.text} strokeWidth={2} />
                </View>
                <Text style={styles.popupItemText}>Log meal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popupItem} onPress={() => handleLogOption('/scan-food')} activeOpacity={0.7}>
                <View style={styles.popupIconWrap}>
                  <Camera size={24} color={Colors.text} strokeWidth={2} />
                </View>
                <Text style={styles.popupItemText}>Scan food</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popupItem} onPress={() => handleLogOption('/barcode-scanner')} activeOpacity={0.7}>
                <View style={styles.popupIconWrap}>
                  <ScanBarcode size={24} color={Colors.text} strokeWidth={2} />
                </View>
                <Text style={styles.popupItemText}>Barcode</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popupItem} onPress={() => handleLogOption('/log-meal')} activeOpacity={0.7}>
                <View style={styles.popupIconWrap}>
                  <Search size={24} color={Colors.text} strokeWidth={2} />
                </View>
                <Text style={styles.popupItemText}>Search food</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          <TouchableOpacity style={styles.popupCloseBtn} onPress={closeLogPopup} activeOpacity={0.8}>
            <X size={22} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  streakIcon: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700' as const,
  },
  weekRow: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  weekRowContent: {
    paddingHorizontal: 20,
    gap: 4,
  },
  weekDayCol: {
    alignItems: 'center',
    width: 44,
  },
  weekDayLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  weekDayLabelToday: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCircleToday: {
    borderWidth: 2,
    borderColor: Colors.todayBorder,
  },
  weekDayCircleHasData: {
    borderWidth: 1.5,
    borderColor: Colors.weekDayActive,
  },
  weekDayDate: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  weekDayDateToday: {
    fontWeight: '700' as const,
  },
  weekDayDateHasData: {
    color: Colors.weekDayActive,
    fontWeight: '600' as const,
  },
  buddySection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  calorieCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  calorieCardInner: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieInfo: {
    flex: 1,
  },
  calorieConsumed: {
    flexDirection: 'row' as const,
  },
  calorieBig: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  calorieTarget: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '400' as const,
  },
  calorieLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  macroRow: {
    flexDirection: 'row' as const,
    marginTop: 12,
  },
  macroGap: {
    width: 8,
  },
  quickActionsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 16,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  mealsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  emptyMeals: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mealGroup: {
    marginBottom: 12,
  },
  mealGroupTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  mealItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  mealMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  deleteBtn: {
    padding: 6,
  },
  bottomSpacer: {
    height: 100,
  },
  fabContainer: {
    position: 'absolute' as const,
    bottom: 16,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  popupOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  popupContainer: {
    width: Dimensions.get('window').width - 56,
    maxWidth: 340,
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  popupGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  popupItem: {
    width: '47%' as any,
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  popupIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  popupItemText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  popupCloseBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
