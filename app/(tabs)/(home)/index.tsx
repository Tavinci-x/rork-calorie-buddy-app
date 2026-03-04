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
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🍱',
  dinner: '🍽️',
  snack: '🍪',
};

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
  const calPercent = profile.dailyCalorieTarget > 0 ? Math.min(Math.round((todayCalories / profile.dailyCalorieTarget) * 100), 999) : 0;

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
            <Text style={styles.appName}>MeowCal</Text>
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
                  styles.weekDayBox,
                  day.isToday && styles.weekDayBoxToday,
                  day.hasData && !day.isToday && styles.weekDayBoxHasData,
                ]}>
                  <Text style={[
                    styles.weekDayDate,
                    day.isToday && styles.weekDayDateToday,
                    day.hasData && !day.isToday && styles.weekDayDateHasData,
                  ]}>{day.date}</Text>
                </View>
                {day.hasData && !day.isToday && (
                  <View style={styles.weekDayDot} />
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.buddySection}>
            <SpeechBubble message={buddyMessage} />
            <BuddyMascot
              stage={buddyStage}
              mood={buddyMood}
              color={profile.buddyColor}
              size={140}
              goalType={profile.goalType}
              imageBase64={profile.buddyImageBase64}
            />
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsLabel}>⚡ Daily Energy</Text>
              <Text style={styles.statsPercent}>{calPercent}%</Text>
            </View>
            <View style={styles.calorieRow}>
              <Text style={styles.calorieBig}>{todayCalories.toLocaleString()}</Text>
              <Text style={styles.calorieTarget}> / {profile.dailyCalorieTarget.toLocaleString()} cal</Text>
            </View>
            <CalorieRing consumed={todayCalories} target={profile.dailyCalorieTarget} />

            <View style={styles.statsDivider} />

            <View style={styles.macroRow}>
              <MacroBar
                label="Protein"
                value={todayProtein}
                target={proteinTarget}
                color={Colors.protein}
                bgColor={Colors.proteinBg}
                icon="🍖"
              />
              <View style={styles.macroGap} />
              <MacroBar
                label="Carbs"
                value={todayCarbs}
                target={carbsTarget}
                color={Colors.carbs}
                bgColor={Colors.carbsBg}
                icon="🌾"
              />
              <View style={styles.macroGap} />
              <MacroBar
                label="Fat"
                value={todayFat}
                target={fatTarget}
                color={Colors.fat}
                bgColor={Colors.fatBg}
                icon="🥑"
              />
            </View>
          </View>

          <View style={styles.mealsSection}>
            <Text style={styles.sectionTitle}>{"📋 Today's Meals"}</Text>
            {todayMeals.length === 0 ? (
              <TouchableOpacity style={styles.emptyMeals} onPress={openLogPopup} activeOpacity={0.7}>
                <Text style={styles.emptyIcon}>🐱</Text>
                <Text style={styles.emptyText}>No meals yet! Tap + to feed me 🐾</Text>
              </TouchableOpacity>
            ) : (
              (['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                const typeMeals = mealsByType[type];
                if (typeMeals.length === 0) return null;
                return (
                  <View key={type} style={styles.mealGroup}>
                    <View style={styles.mealGroupHeader}>
                      <Text style={styles.mealGroupIcon}>{MEAL_ICONS[type]}</Text>
                      <Text style={styles.mealGroupTitle}>{MEAL_LABELS[type]}</Text>
                    </View>
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
                          <Trash2 size={15} color={Colors.textMuted} />
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
            <Plus size={24} color={Colors.white} strokeWidth={3} />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      <Modal visible={showLogPopup} transparent animationType="none" onRequestClose={closeLogPopup}>
        <Animated.View style={[styles.popupOverlay, { opacity: popupAnim }]}>
          <Pressable style={styles.popupBackdrop} onPress={closeLogPopup} />
          <Animated.View style={[styles.popupContainer, { opacity: popupAnim, transform: [{ scale: popupScaleAnim }] }]}>
            <Text style={styles.popupTitle}>Log Food</Text>
            <View style={styles.popupGrid}>
              <TouchableOpacity style={styles.popupItem} onPress={() => handleLogOption('/log-meal')} activeOpacity={0.7}>
                <View style={[styles.popupIconWrap, { backgroundColor: '#FFF3E0' }]}>
                  <UtensilsCrossed size={22} color={Colors.secondary} strokeWidth={2} />
                </View>
                <Text style={styles.popupItemText}>Log meal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popupItem} onPress={() => handleLogOption('/scan-food')} activeOpacity={0.7}>
                <View style={[styles.popupIconWrap, { backgroundColor: '#E8F5E9' }]}>
                  <Camera size={22} color={Colors.success} strokeWidth={2} />
                </View>
                <Text style={styles.popupItemText}>Scan food</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popupItem} onPress={() => handleLogOption('/barcode-scanner')} activeOpacity={0.7}>
                <View style={[styles.popupIconWrap, { backgroundColor: '#E8F1FD' }]}>
                  <ScanBarcode size={22} color={Colors.fat} strokeWidth={2} />
                </View>
                <Text style={styles.popupItemText}>Barcode</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.popupItem} onPress={() => handleLogOption('/log-meal')} activeOpacity={0.7}>
                <View style={[styles.popupIconWrap, { backgroundColor: '#FFEDEC' }]}>
                  <Search size={22} color={Colors.protein} strokeWidth={2} />
                </View>
                <Text style={styles.popupItemText}>Search</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          <TouchableOpacity style={styles.popupCloseBtn} onPress={closeLogPopup} activeOpacity={0.8}>
            <X size={20} color={Colors.white} strokeWidth={3} />
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
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
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 14,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 14,
    color: Colors.streakFire,
    fontWeight: '800' as const,
  },
  weekRow: {
    marginBottom: 12,
    marginHorizontal: -18,
  },
  weekRowContent: {
    paddingHorizontal: 18,
    gap: 6,
  },
  weekDayCol: {
    alignItems: 'center' as const,
    width: 42,
  },
  weekDayLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 5,
    fontWeight: '500' as const,
  },
  weekDayLabelToday: {
    color: Colors.text,
    fontWeight: '700' as const,
  },
  weekDayBox: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  weekDayBoxToday: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomColor: 'rgba(43,43,61,0.7)',
    borderRightColor: 'rgba(43,43,61,0.7)',
  },
  weekDayBoxHasData: {
    borderColor: Colors.weekDayActive,
    borderWidth: 2,
  },
  weekDayDate: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  weekDayDateToday: {
    color: Colors.white,
    fontWeight: '800' as const,
  },
  weekDayDateHasData: {
    color: Colors.weekDayActive,
    fontWeight: '700' as const,
  },
  weekDayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.weekDayActive,
    marginTop: 4,
  },
  buddySection: {
    alignItems: 'center' as const,
    paddingVertical: 2,
    marginBottom: 4,
  },
  statsCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomColor: Colors.pixelShadow,
    borderRightColor: Colors.pixelShadow,
    padding: 16,
    marginBottom: 16,
  },
  statsHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  statsLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  statsPercent: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.calRing,
  },
  calorieRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    marginBottom: 10,
  },
  calorieBig: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  calorieTarget: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statsDivider: {
    height: 2,
    backgroundColor: Colors.divider,
    marginVertical: 14,
    borderRadius: 1,
  },
  macroRow: {
    flexDirection: 'row' as const,
  },
  macroGap: {
    width: 10,
  },
  mealsSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  emptyMeals: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomColor: Colors.pixelShadow,
    borderRightColor: Colors.pixelShadow,
    padding: 28,
    alignItems: 'center' as const,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  mealGroup: {
    marginBottom: 10,
  },
  mealGroupHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 6,
  },
  mealGroupIcon: {
    fontSize: 14,
  },
  mealGroupTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  mealItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.card,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 5,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  mealMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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
    right: 18,
    alignItems: 'center' as const,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomColor: 'rgba(43,43,61,0.6)',
    borderRightColor: 'rgba(43,43,61,0.6)',
  },
  popupOverlay: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  popupContainer: {
    width: SCREEN_WIDTH - 56,
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomColor: Colors.pixelShadow,
    borderRightColor: Colors.pixelShadow,
    padding: 18,
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 14,
  },
  popupGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  popupItem: {
    width: '47%' as any,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingVertical: 18,
    alignItems: 'center' as const,
  },
  popupIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  popupItemText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  popupCloseBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(43,43,61,0.6)',
  },
});
