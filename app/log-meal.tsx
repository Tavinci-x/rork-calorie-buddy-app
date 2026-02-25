import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Animated, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Zap, Camera, ScanBarcode } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { getTodayDate } from '@/utils/helpers';
import { type MealType } from '@/types';

const MEAL_TYPES: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '☀️' },
  { type: 'lunch', label: 'Lunch', emoji: '🌤️' },
  { type: 'dinner', label: 'Dinner', emoji: '🌙' },
  { type: 'snack', label: 'Snack', emoji: '🍪' },
];

export default function LogMealScreen() {
  const router = useRouter();
  const { addMeal, topQuickMeals } = useApp();
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [name, setName] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const successAnim = useRef(new Animated.Value(0)).current;

  const handleLog = useCallback(() => {
    const cal = parseInt(calories);
    if (!cal || cal <= 0) {
      Alert.alert('Missing Calories', 'Please enter the calorie amount.');
      return;
    }

    addMeal({
      date: getTodayDate(),
      mealType,
      name: name.trim() || `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} meal`,
      calories: cal,
      proteinG: protein ? parseFloat(protein) : undefined,
      carbsG: carbs ? parseFloat(carbs) : undefined,
      fatG: fat ? parseFloat(fat) : undefined,
    });

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(successAnim, { toValue: 0, duration: 300, delay: 400, useNativeDriver: true }),
    ]).start(() => {
      router.back();
    });
  }, [calories, name, mealType, protein, carbs, fat, addMeal, router, successAnim]);

  const handleQuickAdd = useCallback((qm: { name: string; calories: number; proteinG?: number; carbsG?: number; fatG?: number; mealType: MealType }) => {
    setName(qm.name);
    setCalories(qm.calories.toString());
    if (qm.proteinG) setProtein(qm.proteinG.toString());
    if (qm.carbsG) setCarbs(qm.carbsG.toString());
    if (qm.fatG) setFat(qm.fatG.toString());
    setMealType(qm.mealType);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <View style={styles.header}>
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Log Meal</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="close-log-meal">
                  <X color={Colors.textSecondary} size={22} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.scanRow}>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => {
                    router.back();
                    setTimeout(() => router.push('/scan-food' as any), 100);
                  }}
                >
                  <Camera size={20} color={Colors.text} />
                  <Text style={styles.scanBtnText}>Scan Food</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => {
                    router.back();
                    setTimeout(() => router.push('/barcode-scanner' as any), 100);
                  }}
                >
                  <ScanBarcode size={20} color={Colors.text} />
                  <Text style={styles.scanBtnText}>Barcode</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map(mt => (
                  <TouchableOpacity
                    key={mt.type}
                    style={[styles.mealTypeBtn, mealType === mt.type && styles.mealTypeBtnActive]}
                    onPress={() => setMealType(mt.type)}
                  >
                    <Text style={styles.mealTypeEmoji}>{mt.emoji}</Text>
                    <Text style={[styles.mealTypeText, mealType === mt.type && styles.mealTypeTextActive]}>
                      {mt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Meal Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Chicken and rice"
                  placeholderTextColor={Colors.textMuted}
                  testID="meal-name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Calories *</Text>
                <TextInput
                  style={[styles.input, styles.inputLarge]}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  testID="meal-calories"
                  autoFocus
                />
              </View>

              <Text style={styles.sectionLabel}>Macros (optional)</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroInput}>
                  <Text style={[styles.macroLabel, { color: Colors.protein }]}>Protein (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.macroInput}>
                  <Text style={[styles.macroLabel, { color: Colors.carbs }]}>Carbs (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.macroInput}>
                  <Text style={[styles.macroLabel, { color: Colors.fat }]}>Fat (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={fat}
                    onChangeText={setFat}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {topQuickMeals.length > 0 && (
                <>
                  <View style={styles.quickHeader}>
                    <Zap size={16} color={Colors.secondary} />
                    <Text style={styles.sectionLabel}>Quick Add</Text>
                  </View>
                  {topQuickMeals.map((qm, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.quickItem}
                      onPress={() => handleQuickAdd(qm)}
                    >
                      <View style={styles.quickInfo}>
                        <Text style={styles.quickName}>{qm.name}</Text>
                        <Text style={styles.quickCals}>{qm.calories} cal</Text>
                      </View>
                      <Text style={styles.quickAdd}>+</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.logBtn, !calories && styles.logBtnDisabled]}
                onPress={handleLog}
                activeOpacity={0.8}
                testID="submit-meal"
              >
                <Text style={styles.logBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <Animated.View style={[styles.successOverlay, { opacity: successAnim }]} pointerEvents="none">
          <Text style={styles.successText}>Logged!</Text>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scanRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 20,
  },
  scanBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.background,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  mealTypeRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 20,
  },
  mealTypeBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  mealTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  mealTypeEmoji: {
    fontSize: 18,
  },
  mealTypeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  mealTypeTextActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500' as const,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  inputLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    paddingVertical: 16,
    textAlign: 'center' as const,
  },
  sectionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  macroRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 24,
  },
  macroInput: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  quickHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  quickItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  quickInfo: {
    flex: 1,
  },
  quickName: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  quickCals: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickAdd: {
    fontSize: 22,
    color: Colors.text,
    fontWeight: '600' as const,
    marginLeft: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  logBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logBtnDisabled: {
    opacity: 0.4,
  },
  logBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52,199,89,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.success,
  },
});
