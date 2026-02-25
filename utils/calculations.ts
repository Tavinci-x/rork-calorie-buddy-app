import { type UserProfile, type BuddyStage, type BuddyMood, type MealEntry, type ActivityLevel, ACTIVITY_LEVELS } from '@/types';
import { getCurrentHour, getTodayDate } from './helpers';

export function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function getActivityMultiplier(activityLevel: ActivityLevel): number {
  const found = ACTIVITY_LEVELS.find(a => a.key === activityLevel);
  return found ? found.multiplier : 1.55;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel = 'moderate'): number {
  const multiplier = getActivityMultiplier(activityLevel);
  return Math.round(bmr * multiplier);
}

export function calculateDailyTarget(profile: Pick<UserProfile, 'currentWeightKg' | 'heightCm' | 'age' | 'gender' | 'goalType' | 'activityLevel'>): number {
  const bmr = calculateBMR(profile.currentWeightKg, profile.heightCm, profile.age, profile.gender);
  const activityLevel = profile.activityLevel || 'moderate';
  const tdee = calculateTDEE(bmr, activityLevel);
  console.log(`BMR: ${bmr}, Activity: ${activityLevel}, TDEE: ${tdee}, Goal: ${profile.goalType}`);
  if (profile.goalType === 'gain') {
    return tdee + 500;
  }
  return Math.max(1200, tdee - 500);
}

export function calculateProgress(profile: UserProfile): number {
  const { startWeightKg, currentWeightKg, goalWeightKg } = profile;
  const totalChange = goalWeightKg - startWeightKg;
  if (totalChange === 0) return 100;
  const currentChange = currentWeightKg - startWeightKg;
  const progress = (currentChange / totalChange) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function getBuddyStage(progress: number): BuddyStage {
  if (progress < 20) return 1;
  if (progress < 40) return 2;
  if (progress < 60) return 3;
  if (progress < 80) return 4;
  return 5;
}

export function getBuddyMood(
  todayMeals: MealEntry[],
  dailyTarget: number,
  streak: number,
  lastOpenDate: string | null,
): BuddyMood {
  const hour = getCurrentHour();

  if (hour >= 23 || hour < 6) return 'sleeping';

  const today = getTodayDate();
  if (lastOpenDate && lastOpenDate < today) {
    const daysSince = Math.round(
      (new Date(today).getTime() - new Date(lastOpenDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince >= 2) return 'sad';
  }

  if (streak >= 3) return 'excited';

  const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
  if (totalCalories > 0 && Math.abs(totalCalories - dailyTarget) / dailyTarget <= 0.1) {
    return 'happy';
  }

  if (todayMeals.length === 0 && hour >= 12) return 'hungry';

  if (todayMeals.length > 0) return 'happy';

  return 'neutral';
}

export function calculateStreak(mealsByDate: Record<string, MealEntry[]>): number {
  let streak = 0;
  const today = new Date();
  const checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const meals = mealsByDate[dateStr];
    if (meals && meals.length > 0) {
      streak++;
    } else if (i > 0) {
      break;
    } else {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}
