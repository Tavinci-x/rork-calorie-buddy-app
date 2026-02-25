export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  name: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  heightCm: number;
  currentWeightKg: number;
  startWeightKg: number;
  goalWeightKg: number;
  goalType: 'gain' | 'lose';
  activityLevel: ActivityLevel;
  dailyCalorieTarget: number;
  startDate: string;
  targetDate: string;
  buddyColor: string;
  buddyImageBase64?: string;
  mascotGenerationCount: number;
  onboardingComplete: boolean;
}

export interface MealEntry {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  timestamp: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  timestamp: string;
}

export interface DailySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsLogged: number;
  targetMet: boolean;
}

export type BuddyMood = 'happy' | 'excited' | 'hungry' | 'sad' | 'sleeping' | 'celebrating' | 'neutral';

export type BuddyStage = 1 | 2 | 3 | 4 | 5;

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; description: string; multiplier: number }[] = [
  { key: 'sedentary', label: 'Sedentary', description: 'Office job, little exercise', multiplier: 1.2 },
  { key: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', multiplier: 1.375 },
  { key: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', multiplier: 1.55 },
  { key: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week', multiplier: 1.725 },
  { key: 'very_active', label: 'Very Active', description: 'Athlete / physical job + training', multiplier: 1.9 },
];

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  gender: 'male',
  age: 25,
  heightCm: 170,
  currentWeightKg: 70,
  startWeightKg: 70,
  goalWeightKg: 65,
  goalType: 'lose',
  activityLevel: 'moderate',
  dailyCalorieTarget: 2000,
  startDate: new Date().toISOString().split('T')[0],
  targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  buddyColor: '#4ADE80',
  mascotGenerationCount: 0,
  onboardingComplete: false,
};
