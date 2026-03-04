import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { User, Target, RotateCcw, ChevronRight, TrendingDown, TrendingUp, Camera, ScanBarcode, Heart, Cat } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import BuddyMascot from '@/components/BuddyMascot';
import { useApp } from '@/providers/AppProvider';
import { calculateDailyTarget } from '@/utils/calculations';
import { MAX_GENERATION_ATTEMPTS } from '@/utils/cartoonify';
import { trpc } from '@/lib/trpc';
import { type ActivityLevel, ACTIVITY_LEVELS } from '@/types';
import { clearAllData } from '@/utils/storage';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile, buddyStage } = useApp();
  const generateMascot = trpc.catMascot.generate.useMutation();
  const [editSection, setEditSection] = useState<string | null>(null);

  const [age, setAge] = useState<string>(profile.age.toString());
  const [height, setHeight] = useState<string>(profile.heightCm.toString());
  const [weight, setWeight] = useState<string>(profile.currentWeightKg.toString());
  const [goalWeight, setGoalWeight] = useState<string>(profile.goalWeightKg.toString());
  const [calorieTarget, setCalorieTarget] = useState<string>(profile.dailyCalorieTarget.toString());
  const [isConvertingPhoto, setIsConvertingPhoto] = useState<boolean>(false);

  const handleSaveProfile = useCallback(() => {
    updateProfile({
      age: parseInt(age) || profile.age,
      heightCm: parseFloat(height) || profile.heightCm,
      currentWeightKg: parseFloat(weight) || profile.currentWeightKg,
    });
    setEditSection(null);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [age, height, weight, profile, updateProfile]);

  const handleSaveGoal = useCallback(() => {
    updateProfile({
      goalWeightKg: parseFloat(goalWeight) || profile.goalWeightKg,
      dailyCalorieTarget: parseInt(calorieTarget) || profile.dailyCalorieTarget,
    });
    setEditSection(null);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [goalWeight, calorieTarget, profile, updateProfile]);

  const handleToggleGoalType = useCallback(() => {
    const newGoalType = profile.goalType === 'gain' ? 'lose' as const : 'gain' as const;
    const newTarget = calculateDailyTarget({ ...profile, goalType: newGoalType });
    updateProfile({ goalType: newGoalType, dailyCalorieTarget: newTarget });
    setCalorieTarget(newTarget.toString());
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [profile, updateProfile]);

  const handleResetProgress = useCallback(() => {
    Alert.alert(
      'Reset All Progress',
      'This will delete all your data including meals, weights, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.replace('/onboarding' as any);
          },
        },
      ]
    );
  }, [router]);

  const handleActivityChange = useCallback((level: ActivityLevel) => {
    const newTarget = calculateDailyTarget({ ...profile, activityLevel: level });
    updateProfile({ activityLevel: level, dailyCalorieTarget: newTarget });
    setCalorieTarget(newTarget.toString());
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, [profile, updateProfile]);

  const recalculateCalories = useCallback(() => {
    const target = calculateDailyTarget(profile);
    updateProfile({ dailyCalorieTarget: target });
    setCalorieTarget(target.toString());
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [profile, updateProfile]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>Profile</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <BuddyMascot
                stage={buddyStage}
                mood="happy"
                color={profile.buddyColor}
                size={60}
                goalType={profile.goalType}
                imageBase64={profile.buddyImageBase64}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name || 'MeowCal User'}</Text>
              <Text style={styles.profileGoal}>
                {profile.goalType === 'lose' ? 'Losing weight' : 'Gaining weight'} · {profile.dailyCalorieTarget} cal/day
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </View>

          <Text style={styles.sectionHeader}>Account</Text>
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setEditSection(editSection === 'profile' ? null : 'profile')}
            >
              <View style={styles.menuIcon}>
                <User size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>Personal Details</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {editSection === 'profile' && (
              <View style={styles.expandedContent}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Age</Text>
                  <TextInput style={styles.settingInput} value={age} onChangeText={setAge} keyboardType="number-pad" />
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Height (cm)</Text>
                  <TextInput style={styles.settingInput} value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Weight (kg)</Text>
                  <TextInput style={styles.settingInput} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {(['male', 'female', 'other'] as const).map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderBtn, profile.gender === g && styles.genderBtnActive]}
                        onPress={() => updateProfile({ gender: g })}
                      >
                        <Text style={[styles.genderText, profile.gender === g && styles.genderTextActive]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setEditSection(editSection === 'goal' ? null : 'goal')}
            >
              <View style={styles.menuIcon}>
                <Target size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>Goals & Calories</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {editSection === 'goal' && (
              <View style={styles.expandedContent}>
                <TouchableOpacity style={styles.goalToggle} onPress={handleToggleGoalType}>
                  {profile.goalType === 'lose' ? (
                    <TrendingDown size={18} color={Colors.success} />
                  ) : (
                    <TrendingUp size={18} color={Colors.secondary} />
                  )}
                  <Text style={styles.goalToggleText}>
                    {profile.goalType === 'lose' ? 'Lose Weight' : 'Gain Weight'}
                  </Text>
                  <Text style={styles.goalToggleHint}>Tap to switch</Text>
                </TouchableOpacity>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Goal Weight (kg)</Text>
                  <TextInput style={styles.settingInput} value={goalWeight} onChangeText={setGoalWeight} keyboardType="decimal-pad" />
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Activity Level</Text>
                  <View style={styles.activityList}>
                    {ACTIVITY_LEVELS.map(level => (
                      <TouchableOpacity
                        key={level.key}
                        style={[styles.activityOption, profile.activityLevel === level.key && styles.activityOptionActive]}
                        onPress={() => handleActivityChange(level.key)}
                      >
                        <View style={styles.activityDot}>
                          {profile.activityLevel === level.key && <View style={styles.activityDotInner} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.activityOptionLabel, profile.activityLevel === level.key && styles.activityOptionLabelActive]}>{level.label}</Text>
                          <Text style={styles.activityOptionDesc}>{level.description}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Daily Calories</Text>
                  <TextInput style={styles.settingInput} value={calorieTarget} onChangeText={setCalorieTarget} keyboardType="number-pad" />
                </View>
                <TouchableOpacity style={styles.recalcBtn} onPress={recalculateCalories}>
                  <Text style={styles.recalcText}>Recalculate from Stats</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/log-weight' as any)}
            >
              <View style={styles.menuIcon}>
                <Heart size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>Weight History</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>Buddy</Text>
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                const attemptsUsed = profile.mascotGenerationCount ?? 0;
                if (attemptsUsed >= MAX_GENERATION_ATTEMPTS) {
                  Alert.alert('No Attempts Left', `You've used all ${MAX_GENERATION_ATTEMPTS} generation attempts.`);
                  return;
                }
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.7,
                    allowsEditing: true,
                    aspect: [1, 1],
                    base64: true,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setIsConvertingPhoto(true);
                    try {
                      let imageBase64 = result.assets[0].base64;
                      if (!imageBase64) {
                        const resp = await fetch(result.assets[0].uri);
                        const blob = await resp.blob();
                        imageBase64 = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const r = reader.result as string;
                            resolve(r.split(',')[1] || '');
                          };
                          reader.onerror = reject;
                          reader.readAsDataURL(blob);
                        });
                      }
                      const genResult = await generateMascot.mutateAsync({ imageBase64 });
                      const base64 = genResult.imageBase64;
                      updateProfile({
                        buddyImageBase64: base64,
                        mascotGenerationCount: (profile.mascotGenerationCount ?? 0) + 1,
                      });
                      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (err) {
                      console.log('Photo conversion error:', err);
                      Alert.alert('Error', 'Our pixel art machine is taking a cat nap. Please try again.');
                    } finally {
                      setIsConvertingPhoto(false);
                    }
                  }
                } catch (err) {
                  console.log('Image picker error:', err);
                }
              }}
            >
              <View style={styles.menuIcon}>
                <Cat size={18} color={Colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>
                  {isConvertingPhoto ? 'Converting...' : (profile.buddyImageBase64 ? 'Regenerate Cat Mascot' : 'Set Cat Photo')}
                </Text>
                {!isConvertingPhoto && (
                  <Text style={styles.attemptsHint}>
                    {MAX_GENERATION_ATTEMPTS - (profile.mascotGenerationCount ?? 0)} of {MAX_GENERATION_ATTEMPTS} attempts remaining
                  </Text>
                )}
              </View>
              {isConvertingPhoto ? (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              ) : (
                <ChevronRight size={16} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
            {profile.buddyImageBase64 ? (
              <>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    Alert.alert('Remove Cat Photo', 'Switch back to the default mascot?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => updateProfile({ buddyImageBase64: undefined }),
                      },
                    ]);
                  }}
                >
                  <View style={styles.menuIcon}>
                    <RotateCcw size={18} color={Colors.accent} />
                  </View>
                  <Text style={[styles.menuLabel, { color: Colors.accent }]}>Remove Cat Photo</Text>
                  <ChevronRight size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          <Text style={styles.sectionHeader}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/scan-food' as any)}>
              <Camera size={24} color={Colors.text} />
              <Text style={styles.quickCardText}>Scan Food</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/barcode-scanner' as any)}>
              <ScanBarcode size={24} color={Colors.text} />
              <Text style={styles.quickCardText}>Barcode</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>Account Actions</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={handleResetProgress}>
              <View style={styles.menuIcon}>
                <RotateCcw size={18} color={Colors.accent} />
              </View>
              <Text style={[styles.menuLabel, { color: Colors.accent }]}>Reset All Progress</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>MeowCal v1.0.0</Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
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
  pageTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  profileGoal: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 60,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  settingRow: {
    marginBottom: 14,
  },
  settingLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  settingInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  genderRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: Colors.text,
  },
  genderText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  genderTextActive: {
    color: Colors.white,
    fontWeight: '600' as const,
  },
  goalToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  goalToggleText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  goalToggleHint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  recalcBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  recalcText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },

  quickGrid: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickCardText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  version: {
    textAlign: 'center' as const,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  bottomSpacer: {
    height: 40,
  },
  activityList: {
    gap: 6,
  },
  activityOption: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activityOptionActive: {
    borderColor: Colors.text,
    backgroundColor: Colors.white,
  },
  activityDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.text,
  },
  activityOptionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  activityOptionLabelActive: {
    color: Colors.text,
  },
  activityOptionDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  attemptsHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
