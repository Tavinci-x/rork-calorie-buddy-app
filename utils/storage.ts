import AsyncStorage from '@react-native-async-storage/async-storage';
import { type UserProfile, type MealEntry, type WeightEntry, DEFAULT_PROFILE } from '@/types';

const KEYS = {
  PROFILE: 'calbuddy_profile',
  MEALS: 'calbuddy_meals',
  WEIGHTS: 'calbuddy_weights',
  LAST_OPEN: 'calbuddy_last_open',
  QUICK_MEALS: 'calbuddy_quick_meals',
} as const;

export async function loadProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    if (data) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
    }
    return DEFAULT_PROFILE;
  } catch (e) {
    console.log('Error loading profile:', e);
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    console.log('Profile saved successfully');
  } catch (e) {
    console.log('Error saving profile:', e);
  }
}

export async function loadMeals(): Promise<MealEntry[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MEALS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.log('Error loading meals:', e);
    return [];
  }
}

export async function saveMeals(meals: MealEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(meals));
    console.log('Meals saved:', meals.length);
  } catch (e) {
    console.log('Error saving meals:', e);
  }
}

export async function loadWeights(): Promise<WeightEntry[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.WEIGHTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.log('Error loading weights:', e);
    return [];
  }
}

export async function saveWeights(weights: WeightEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.WEIGHTS, JSON.stringify(weights));
    console.log('Weights saved:', weights.length);
  } catch (e) {
    console.log('Error saving weights:', e);
  }
}

export async function loadLastOpen(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_OPEN);
  } catch {
    return null;
  }
}

export async function saveLastOpen(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_OPEN, date);
  } catch (e) {
    console.log('Error saving last open:', e);
  }
}

export interface QuickMeal {
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  mealType: MealEntry['mealType'];
  count: number;
}

export async function loadQuickMeals(): Promise<QuickMeal[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.QUICK_MEALS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveQuickMeals(meals: QuickMeal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.QUICK_MEALS, JSON.stringify(meals));
  } catch (e) {
    console.log('Error saving quick meals:', e);
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    console.log('All data cleared');
  } catch (e) {
    console.log('Error clearing data:', e);
  }
}
