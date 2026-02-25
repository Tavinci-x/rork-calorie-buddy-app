import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Camera, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { getTodayDate } from '@/utils/helpers';
import { type MealType } from '@/types';

const nutritionSchema = z.object({
  name: z.string().describe('Name of the food item'),
  calories: z.number().describe('Estimated calories'),
  proteinG: z.number().describe('Estimated protein in grams'),
  carbsG: z.number().describe('Estimated carbs in grams'),
  fatG: z.number().describe('Estimated fat in grams'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('Most likely meal type based on the food'),
});

export default function ScanFoodScreen() {
  const router = useRouter();
  const { addMeal } = useApp();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<z.infer<typeof nutritionSchema> | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editCalories, setEditCalories] = useState<string>('');
  const [editProtein, setEditProtein] = useState<string>('');
  const [editCarbs, setEditCarbs] = useState<string>('');
  const [editFat, setEditFat] = useState<string>('');

  const takePhoto = useCallback(async () => {
    try {
      const permResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to scan food.');
        return;
      }

      const pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        const asset = pickerResult.assets[0];
        setImageUri(asset.uri);
        setResult(null);
        analyzeFood(asset.base64 || '', asset.uri);
      }
    } catch (e) {
      console.log('Error taking photo:', e);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        const asset = pickerResult.assets[0];
        setImageUri(asset.uri);
        setResult(null);
        analyzeFood(asset.base64 || '', asset.uri);
      }
    } catch (e) {
      console.log('Error picking image:', e);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, []);

  const analyzeFood = useCallback(async (base64: string, uri: string) => {
    setIsAnalyzing(true);
    try {
      const imageData = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;

      const response = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this food image and estimate the nutritional information. Provide the food name, estimated calories, protein, carbs, and fat in grams. Also suggest the most likely meal type.' },
              { type: 'image', image: imageData },
            ],
          },
        ],
        schema: nutritionSchema,
      });

      console.log('AI food analysis result:', response);
      setResult(response);
      setEditName(response.name);
      setEditCalories(response.calories.toString());
      setEditProtein(response.proteinG.toString());
      setEditCarbs(response.carbsG.toString());
      setEditFat(response.fatG.toString());

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('Error analyzing food:', e);
      Alert.alert('Analysis Failed', 'Could not analyze the food image. Please try again or log manually.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!result) return;

    const cal = parseInt(editCalories);
    if (!cal || cal <= 0) {
      Alert.alert('Invalid', 'Please enter valid calories.');
      return;
    }

    addMeal({
      date: getTodayDate(),
      mealType: result.mealType as MealType,
      name: editName || result.name,
      calories: cal,
      proteinG: parseFloat(editProtein) || undefined,
      carbsG: parseFloat(editCarbs) || undefined,
      fatG: parseFloat(editFat) || undefined,
    });

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [result, editName, editCalories, editProtein, editCarbs, editFat, addMeal, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Scan Food</Text>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {!imageUri ? (
              <View style={styles.cameraPrompt}>
                <View style={styles.cameraIconCircle}>
                  <Camera size={40} color={Colors.textSecondary} />
                </View>
                <Text style={styles.promptTitle}>Take a photo of your food</Text>
                <Text style={styles.promptSubtitle}>Our AI will estimate the nutrition info</Text>

                <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
                  <Camera size={20} color={Colors.white} />
                  <Text style={styles.primaryBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromLibrary}>
                  <Text style={styles.secondaryBtnText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.foodImage} contentFit="cover" />
                </View>

                {isAnalyzing && (
                  <View style={styles.analyzingContainer}>
                    <ActivityIndicator size="small" color={Colors.text} />
                    <Text style={styles.analyzingText}>Analyzing your food...</Text>
                  </View>
                )}

                {result && !isAnalyzing && (
                  <View style={styles.resultSection}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultTitle}>{result.name}</Text>
                    </View>

                    <View style={styles.nutritionCard}>
                      <Text style={styles.nutritionLabel}>Calories</Text>
                      <TextInput
                        style={styles.nutritionValue}
                        value={editCalories}
                        onChangeText={setEditCalories}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View style={styles.macroCards}>
                      <View style={[styles.macroCard, { backgroundColor: Colors.proteinBg }]}>
                        <Text style={[styles.macroCardLabel, { color: Colors.protein }]}>Protein</Text>
                        <TextInput
                          style={styles.macroCardValue}
                          value={editProtein}
                          onChangeText={setEditProtein}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.macroCardUnit}>g</Text>
                      </View>
                      <View style={[styles.macroCard, { backgroundColor: Colors.carbsBg }]}>
                        <Text style={[styles.macroCardLabel, { color: Colors.carbs }]}>Carbs</Text>
                        <TextInput
                          style={styles.macroCardValue}
                          value={editCarbs}
                          onChangeText={setEditCarbs}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.macroCardUnit}>g</Text>
                      </View>
                      <View style={[styles.macroCard, { backgroundColor: Colors.fatBg }]}>
                        <Text style={[styles.macroCardLabel, { color: Colors.fat }]}>Fats</Text>
                        <TextInput
                          style={styles.macroCardValue}
                          value={editFat}
                          onChangeText={setEditFat}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.macroCardUnit}>g</Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
                      <Text style={styles.retakeBtnText}>Retake Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {result && !isAnalyzing && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
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
  cameraPrompt: {
    alignItems: 'center',
    paddingTop: 60,
  },
  cameraIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  promptSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  primaryBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  secondaryBtn: {
    paddingVertical: 14,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  imageContainer: {
    borderRadius: 20,
    overflow: 'hidden' as const,
    marginBottom: 16,
    height: 240,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  analyzingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  analyzingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  resultSection: {
    paddingTop: 4,
  },
  resultHeader: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  nutritionCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nutritionValue: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'right' as const,
    minWidth: 80,
  },
  macroCards: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  macroCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  macroCardLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  macroCardValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    minWidth: 50,
  },
  macroCardUnit: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  retakeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  retakeBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
