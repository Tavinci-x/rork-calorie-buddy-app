import { supabase } from '@/lib/supabase';
import { type UserProfile, type MealEntry, type WeightEntry, DEFAULT_PROFILE } from '@/types';
import type { QuickMeal } from '@/utils/storage';

export async function loadProfileFromSupabase(userId: string): Promise<UserProfile> {
  try {
    console.log('[supabase-storage] Loading profile for user:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[supabase-storage] No profile found, returning default');
        return DEFAULT_PROFILE;
      }
      console.log('[supabase-storage] Error loading profile:', error.message);
      return DEFAULT_PROFILE;
    }

    if (!data) return DEFAULT_PROFILE;

    return {
      name: data.name ?? DEFAULT_PROFILE.name,
      gender: data.gender ?? DEFAULT_PROFILE.gender,
      age: data.age ?? DEFAULT_PROFILE.age,
      heightCm: data.height_cm ?? DEFAULT_PROFILE.heightCm,
      currentWeightKg: data.current_weight_kg ?? DEFAULT_PROFILE.currentWeightKg,
      startWeightKg: data.start_weight_kg ?? DEFAULT_PROFILE.startWeightKg,
      goalWeightKg: data.goal_weight_kg ?? DEFAULT_PROFILE.goalWeightKg,
      goalType: data.goal_type ?? DEFAULT_PROFILE.goalType,
      activityLevel: data.activity_level ?? DEFAULT_PROFILE.activityLevel,
      dailyCalorieTarget: data.daily_calorie_target ?? DEFAULT_PROFILE.dailyCalorieTarget,
      startDate: data.start_date ?? DEFAULT_PROFILE.startDate,
      targetDate: data.target_date ?? DEFAULT_PROFILE.targetDate,
      buddyColor: data.buddy_color ?? DEFAULT_PROFILE.buddyColor,
      buddyImageBase64: data.buddy_image_base64 ?? undefined,
      mascotGenerationCount: data.mascot_generation_count ?? 0,
      onboardingComplete: data.onboarding_complete ?? false,
    };
  } catch (e) {
    console.log('[supabase-storage] Error loading profile:', e);
    return DEFAULT_PROFILE;
  }
}

export async function saveProfileToSupabase(userId: string, profile: UserProfile): Promise<void> {
  try {
    console.log('[supabase-storage] Saving profile for user:', userId);
    const row = {
      user_id: userId,
      name: profile.name,
      gender: profile.gender,
      age: profile.age,
      height_cm: profile.heightCm,
      current_weight_kg: profile.currentWeightKg,
      start_weight_kg: profile.startWeightKg,
      goal_weight_kg: profile.goalWeightKg,
      goal_type: profile.goalType,
      activity_level: profile.activityLevel,
      daily_calorie_target: profile.dailyCalorieTarget,
      start_date: profile.startDate,
      target_date: profile.targetDate,
      buddy_color: profile.buddyColor,
      buddy_image_base64: profile.buddyImageBase64 ?? null,
      mascot_generation_count: profile.mascotGenerationCount,
      onboarding_complete: profile.onboardingComplete,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.log('[supabase-storage] Error saving profile:', error.message);
    } else {
      console.log('[supabase-storage] Profile saved successfully');
    }
  } catch (e) {
    console.log('[supabase-storage] Error saving profile:', e);
  }
}

export async function loadMealsFromSupabase(userId: string): Promise<MealEntry[]> {
  try {
    console.log('[supabase-storage] Loading meals for user:', userId);
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.log('[supabase-storage] Error loading meals:', error.message);
      return [];
    }

    return (data ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      date: m.date as string,
      mealType: m.meal_type as MealEntry['mealType'],
      name: m.name as string,
      calories: m.calories as number,
      proteinG: (m.protein_g as number) ?? undefined,
      carbsG: (m.carbs_g as number) ?? undefined,
      fatG: (m.fat_g as number) ?? undefined,
      timestamp: m.timestamp as string,
    }));
  } catch (e) {
    console.log('[supabase-storage] Error loading meals:', e);
    return [];
  }
}

export async function saveMealToSupabase(userId: string, meal: MealEntry): Promise<void> {
  try {
    const { error } = await supabase.from('meals').upsert({
      id: meal.id,
      user_id: userId,
      date: meal.date,
      meal_type: meal.mealType,
      name: meal.name,
      calories: meal.calories,
      protein_g: meal.proteinG ?? null,
      carbs_g: meal.carbsG ?? null,
      fat_g: meal.fatG ?? null,
      timestamp: meal.timestamp,
    }, { onConflict: 'id' });

    if (error) console.log('[supabase-storage] Error saving meal:', error.message);
  } catch (e) {
    console.log('[supabase-storage] Error saving meal:', e);
  }
}

export async function deleteMealFromSupabase(mealId: string): Promise<void> {
  try {
    const { error } = await supabase.from('meals').delete().eq('id', mealId);
    if (error) console.log('[supabase-storage] Error deleting meal:', error.message);
  } catch (e) {
    console.log('[supabase-storage] Error deleting meal:', e);
  }
}

export async function loadWeightsFromSupabase(userId: string): Promise<WeightEntry[]> {
  try {
    console.log('[supabase-storage] Loading weights for user:', userId);
    const { data, error } = await supabase
      .from('weights')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.log('[supabase-storage] Error loading weights:', error.message);
      return [];
    }

    return (data ?? []).map((w: Record<string, unknown>) => ({
      id: w.id as string,
      date: w.date as string,
      weightKg: w.weight_kg as number,
      timestamp: w.timestamp as string,
    }));
  } catch (e) {
    console.log('[supabase-storage] Error loading weights:', e);
    return [];
  }
}

export async function saveWeightToSupabase(userId: string, weight: WeightEntry): Promise<void> {
  try {
    const { error } = await supabase.from('weights').upsert({
      id: weight.id,
      user_id: userId,
      date: weight.date,
      weight_kg: weight.weightKg,
      timestamp: weight.timestamp,
    }, { onConflict: 'id' });

    if (error) console.log('[supabase-storage] Error saving weight:', error.message);
  } catch (e) {
    console.log('[supabase-storage] Error saving weight:', e);
  }
}

export async function loadQuickMealsFromSupabase(userId: string): Promise<QuickMeal[]> {
  try {
    const { data, error } = await supabase
      .from('quick_meals')
      .select('*')
      .eq('user_id', userId)
      .order('count', { ascending: false });

    if (error) {
      console.log('[supabase-storage] Error loading quick meals:', error.message);
      return [];
    }

    return (data ?? []).map((q: Record<string, unknown>) => ({
      name: q.name as string,
      calories: q.calories as number,
      proteinG: (q.protein_g as number) ?? undefined,
      carbsG: (q.carbs_g as number) ?? undefined,
      fatG: (q.fat_g as number) ?? undefined,
      mealType: q.meal_type as MealEntry['mealType'],
      count: q.count as number,
    }));
  } catch (e) {
    console.log('[supabase-storage] Error loading quick meals:', e);
    return [];
  }
}

export async function saveQuickMealsToSupabase(userId: string, quickMeals: QuickMeal[]): Promise<void> {
  try {
    await supabase.from('quick_meals').delete().eq('user_id', userId);

    if (quickMeals.length > 0) {
      const rows = quickMeals.map(q => ({
        user_id: userId,
        name: q.name,
        calories: q.calories,
        protein_g: q.proteinG ?? null,
        carbs_g: q.carbsG ?? null,
        fat_g: q.fatG ?? null,
        meal_type: q.mealType,
        count: q.count,
      }));

      const { error } = await supabase.from('quick_meals').insert(rows);
      if (error) console.log('[supabase-storage] Error saving quick meals:', error.message);
    }
  } catch (e) {
    console.log('[supabase-storage] Error saving quick meals:', e);
  }
}

export async function clearAllSupabaseData(userId: string): Promise<void> {
  try {
    console.log('[supabase-storage] Clearing all data for user:', userId);
    await Promise.all([
      supabase.from('meals').delete().eq('user_id', userId),
      supabase.from('weights').delete().eq('user_id', userId),
      supabase.from('quick_meals').delete().eq('user_id', userId),
      supabase.from('profiles').delete().eq('user_id', userId),
    ]);
    console.log('[supabase-storage] All data cleared');
  } catch (e) {
    console.log('[supabase-storage] Error clearing data:', e);
  }
}
