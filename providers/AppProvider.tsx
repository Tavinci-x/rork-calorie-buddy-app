import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { type UserProfile, type MealEntry, type WeightEntry, type BuddyMood, type BuddyStage, DEFAULT_PROFILE } from '@/types';
import { loadProfile, saveProfile, loadMeals, saveMeals, loadWeights, saveWeights, loadLastOpen, saveLastOpen, loadQuickMeals, saveQuickMeals, type QuickMeal } from '@/utils/storage';
import { calculateProgress, getBuddyStage, getBuddyMood, calculateStreak } from '@/utils/calculations';
import { getTodayDate, generateId } from '@/utils/helpers';

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [quickMeals, setQuickMeals] = useState<QuickMeal[]>([]);
  const [lastOpenDate, setLastOpenDate] = useState<string | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: loadProfile,
  });

  const mealsQuery = useQuery({
    queryKey: ['meals'],
    queryFn: loadMeals,
  });

  const weightsQuery = useQuery({
    queryKey: ['weights'],
    queryFn: loadWeights,
  });

  const quickMealsQuery = useQuery({
    queryKey: ['quickMeals'],
    queryFn: loadQuickMeals,
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
      await saveProfile(newProfile);
      return newProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const mealMutation = useMutation({
    mutationFn: async (newMeals: MealEntry[]) => {
      await saveMeals(newMeals);
      return newMeals;
    },
    onSuccess: (data) => {
      setMeals(data);
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const weightMutation = useMutation({
    mutationFn: async (newWeights: WeightEntry[]) => {
      await saveWeights(newWeights);
      return newWeights;
    },
    onSuccess: (data) => {
      setWeights(data);
      queryClient.invalidateQueries({ queryKey: ['weights'] });
    },
  });

  const quickMealMutation = useMutation({
    mutationFn: async (newQuickMeals: QuickMeal[]) => {
      await saveQuickMeals(newQuickMeals);
      return newQuickMeals;
    },
    onSuccess: (data) => {
      setQuickMeals(data);
    },
  });

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    profileMutation.mutate(updated);
  }, [profile, profileMutation]);

  const addMeal = useCallback((meal: Omit<MealEntry, 'id' | 'timestamp'>) => {
    const newMeal: MealEntry = {
      ...meal,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...meals, newMeal];
    mealMutation.mutate(updated);

    const existing = quickMeals.find(q => q.name.toLowerCase() === meal.name.toLowerCase());
    if (existing) {
      const updatedQuick = quickMeals.map(q =>
        q.name.toLowerCase() === meal.name.toLowerCase()
          ? { ...q, count: q.count + 1 }
          : q
      );
      quickMealMutation.mutate(updatedQuick);
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
      quickMealMutation.mutate([...quickMeals, newQuick].slice(-20));
    }

    return newMeal;
  }, [meals, quickMeals, mealMutation, quickMealMutation]);

  const deleteMeal = useCallback((mealId: string) => {
    const updated = meals.filter(m => m.id !== mealId);
    mealMutation.mutate(updated);
  }, [meals, mealMutation]);

  const addWeight = useCallback((weightKg: number, date?: string) => {
    const entry: WeightEntry = {
      id: generateId(),
      date: date || getTodayDate(),
      weightKg,
      timestamp: new Date().toISOString(),
    };
    const updated = [...weights, entry];
    weightMutation.mutate(updated);

    updateProfile({ currentWeightKg: weightKg });
    return entry;
  }, [weights, weightMutation, updateProfile]);

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
  };
});
