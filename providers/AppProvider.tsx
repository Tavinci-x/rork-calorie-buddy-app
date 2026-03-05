import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { type UserProfile, type MealEntry, type WeightEntry, DEFAULT_PROFILE } from '@/types';
import { loadProfile, saveProfile, loadMeals, saveMeals, loadWeights, saveWeights, loadLastOpen, saveLastOpen, loadQuickMeals, saveQuickMeals, type QuickMeal } from '@/utils/storage';
import {
  loadProfileFromSupabase, saveProfileToSupabase,
  loadMealsFromSupabase, saveMealToSupabase, deleteMealFromSupabase,
  loadWeightsFromSupabase, saveWeightToSupabase,
  loadQuickMealsFromSupabase, saveQuickMealsToSupabase,
  clearAllSupabaseData,
} from '@/utils/supabase-storage';
import { calculateProgress, getBuddyStage, getBuddyMood, calculateStreak } from '@/utils/calculations';
import { getTodayDate, generateId } from '@/utils/helpers';
import { useAuth } from '@/providers/AuthProvider';

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [quickMeals, setQuickMeals] = useState<QuickMeal[]>([]);
  const [lastOpenDate, setLastOpenDate] = useState<string | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (userId) {
        return loadProfileFromSupabase(userId);
      }
      return loadProfile();
    },
    enabled: isAuthenticated ? !!userId : true,
  });

  const mealsQuery = useQuery({
    queryKey: ['meals', userId],
    queryFn: async () => {
      if (userId) {
        return loadMealsFromSupabase(userId);
      }
      return loadMeals();
    },
    enabled: isAuthenticated ? !!userId : true,
  });

  const weightsQuery = useQuery({
    queryKey: ['weights', userId],
    queryFn: async () => {
      if (userId) {
        return loadWeightsFromSupabase(userId);
      }
      return loadWeights();
    },
    enabled: isAuthenticated ? !!userId : true,
  });

  const quickMealsQuery = useQuery({
    queryKey: ['quickMeals', userId],
    queryFn: async () => {
      if (userId) {
        return loadQuickMealsFromSupabase(userId);
      }
      return loadQuickMeals();
    },
    enabled: isAuthenticated ? !!userId : true,
  });

  const lastOpenQuery = useQuery({
    queryKey: ['lastOpen'],
    queryFn: loadLastOpen,
  });

  useEffect(() => {
    if (profileQuery.data !== undefined) setProfile(profileQuery.data);
  }, [profileQuery.data]);

  useEffect(() => {
    if (mealsQuery.data) setMeals(mealsQuery.data);
  }, [mealsQuery.data]);

  useEffect(() => {
    if (weightsQuery.data) setWeights(weightsQuery.data);
  }, [weightsQuery.data]);

  useEffect(() => {
    if (quickMealsQuery.data) setQuickMeals(quickMealsQuery.data);
  }, [quickMealsQuery.data]);

  useEffect(() => {
    if (lastOpenQuery.data !== undefined) setLastOpenDate(lastOpenQuery.data);
  }, [lastOpenQuery.data]);

  useEffect(() => {
    if (
      profileQuery.isFetched &&
      mealsQuery.isFetched &&
      weightsQuery.isFetched
    ) {
      setIsReady(true);
      saveLastOpen(getTodayDate());
    }
  }, [profileQuery.isFetched, mealsQuery.isFetched, weightsQuery.isFetched]);

  const profileMutation = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      if (userId) {
        await saveProfileToSupabase(userId, newProfile);
      }
      await saveProfile(newProfile);
      return newProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  const mealAddMutation = useMutation({
    mutationFn: async (meal: MealEntry) => {
      if (userId) {
        await saveMealToSupabase(userId, meal);
      }
      const updated = [...meals, meal];
      await saveMeals(updated);
      return { meal, updated };
    },
    onSuccess: ({ updated }) => {
      setMeals(updated);
      queryClient.invalidateQueries({ queryKey: ['meals', userId] });
    },
  });

  const mealDeleteMutation = useMutation({
    mutationFn: async (mealId: string) => {
      if (userId) {
        await deleteMealFromSupabase(mealId);
      }
      const updated = meals.filter(m => m.id !== mealId);
      await saveMeals(updated);
      return updated;
    },
    onSuccess: (updated) => {
      setMeals(updated);
      queryClient.invalidateQueries({ queryKey: ['meals', userId] });
    },
  });

  const weightMutation = useMutation({
    mutationFn: async (entry: WeightEntry) => {
      if (userId) {
        await saveWeightToSupabase(userId, entry);
      }
      const updated = [...weights, entry];
      await saveWeights(updated);
      return { entry, updated };
    },
    onSuccess: ({ updated }) => {
      setWeights(updated);
      queryClient.invalidateQueries({ queryKey: ['weights', userId] });
    },
  });

  const quickMealMutation = useMutation({
    mutationFn: async (newQuickMeals: QuickMeal[]) => {
      if (userId) {
        await saveQuickMealsToSupabase(userId, newQuickMeals);
      }
      await saveQuickMeals(newQuickMeals);
      return newQuickMeals;
    },
    onSuccess: (data) => {
      setQuickMeals(data);
    },
  });

  const { mutate: mutateProfile } = profileMutation;
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    mutateProfile(updated);
  }, [profile, mutateProfile]);

  const { mutate: mutateAddMeal } = mealAddMutation;
  const { mutate: mutateQuickMeal } = quickMealMutation;
  const addMeal = useCallback((meal: Omit<MealEntry, 'id' | 'timestamp'>) => {
    const newMeal: MealEntry = {
      ...meal,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    mutateAddMeal(newMeal);

    const existing = quickMeals.find(q => q.name.toLowerCase() === meal.name.toLowerCase());
    if (existing) {
      const updatedQuick = quickMeals.map(q =>
        q.name.toLowerCase() === meal.name.toLowerCase()
          ? { ...q, count: q.count + 1 }
          : q
      );
      mutateQuickMeal(updatedQuick);
    } else {
      const newQuick: QuickMeal = {
        name: meal.name,
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
        mealType: meal.mealType,
        count: 1,
      };
      mutateQuickMeal([...quickMeals, newQuick].slice(-20));
    }

    return newMeal;
  }, [quickMeals, mutateAddMeal, mutateQuickMeal]);

  const { mutate: mutateDeleteMeal } = mealDeleteMutation;
  const deleteMeal = useCallback((mealId: string) => {
    mutateDeleteMeal(mealId);
  }, [mutateDeleteMeal]);

  const { mutate: mutateWeight } = weightMutation;
  const addWeight = useCallback((weightKg: number, date?: string) => {
    const entry: WeightEntry = {
      id: generateId(),
      date: date || getTodayDate(),
      weightKg,
      timestamp: new Date().toISOString(),
    };
    mutateWeight(entry);
    updateProfile({ currentWeightKg: weightKg });
    return entry;
  }, [mutateWeight, updateProfile]);

  const resetAllData = useCallback(async () => {
    if (userId) {
      await clearAllSupabaseData(userId);
    }
    const { clearAllData } = await import('@/utils/storage');
    await clearAllData();
    setProfile(DEFAULT_PROFILE);
    setMeals([]);
    setWeights([]);
    setQuickMeals([]);
    queryClient.invalidateQueries();
  }, [userId, queryClient]);

  const todayMeals = useMemo(() => {
    const today = getTodayDate();
    return meals.filter(m => m.date === today);
  }, [meals]);

  const todayCalories = useMemo(() => {
    return todayMeals.reduce((sum, m) => sum + m.calories, 0);
  }, [todayMeals]);

  const todayProtein = useMemo(() => {
    return todayMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0);
  }, [todayMeals]);

  const todayCarbs = useMemo(() => {
    return todayMeals.reduce((sum, m) => sum + (m.carbsG || 0), 0);
  }, [todayMeals]);

  const todayFat = useMemo(() => {
    return todayMeals.reduce((sum, m) => sum + (m.fatG || 0), 0);
  }, [todayMeals]);

  const mealsByDate = useMemo(() => {
    const grouped: Record<string, MealEntry[]> = {};
    meals.forEach(m => {
      if (!grouped[m.date]) grouped[m.date] = [];
      grouped[m.date].push(m);
    });
    return grouped;
  }, [meals]);

  const streak = useMemo(() => calculateStreak(mealsByDate), [mealsByDate]);

  const progress = useMemo(() => calculateProgress(profile), [profile]);
  const buddyStage = useMemo(() => getBuddyStage(progress), [progress]);
  const buddyMood = useMemo(
    () => getBuddyMood(todayMeals, profile.dailyCalorieTarget, streak, lastOpenDate),
    [todayMeals, profile.dailyCalorieTarget, streak, lastOpenDate]
  );

  const topQuickMeals = useMemo(() => {
    return [...quickMeals].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [quickMeals]);

  return {
    profile,
    updateProfile,
    meals,
    addMeal,
    deleteMeal,
    weights,
    addWeight,
    todayMeals,
    todayCalories,
    todayProtein,
    todayCarbs,
    todayFat,
    mealsByDate,
    streak,
    progress,
    buddyStage,
    buddyMood,
    topQuickMeals,
    isReady,
    resetAllData,
  };
});
