import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { formatDate } from '@/utils/helpers';

export default function LogWeightScreen() {
  const router = useRouter();
  const { addWeight, profile, weights } = useApp();
  const [weightVal, setWeightVal] = useState<string>(profile.currentWeightKg.toString());

  const lastWeight = weights.length > 0
    ? weights[weights.length - 1].weightKg
    : profile.startWeightKg;

  const lastDate = weights.length > 0 ? weights[weights.length - 1].date : null;

  const diff = weightVal ? (parseFloat(weightVal) - lastWeight) : 0;

  const handleLog = useCallback(() => {
    const w = parseFloat(weightVal);
    if (!w || w <= 0 || w > 500) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }
    addWeight(w);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [weightVal, addWeight, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Log Weight</Text>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            {lastDate && (
              <Text style={styles.lastWeighIn}>Last Weigh-In: {formatDate(lastDate)}</Text>
            )}

            <TextInput
              style={styles.weightInput}
              value={weightVal}
              onChangeText={setWeightVal}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              testID="weight-input"
            />
            <Text style={styles.unit}>kg</Text>

            {diff !== 0 && (
              <Text style={[styles.diffText, diff > 0 ? styles.diffUp : styles.diffDown]}>
                → {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg since {lastDate ? formatDate(lastDate) : 'start'}
              </Text>
            )}

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Start</Text>
                <Text style={styles.infoValue}>{profile.startWeightKg} kg</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Goal</Text>
                <Text style={styles.infoValue}>{profile.goalWeightKg} kg</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Current</Text>
                <Text style={styles.infoValue}>{lastWeight} kg</Text>
              </View>
            </View>

            {weights.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>History</Text>
                {[...weights].reverse().slice(0, 5).map((w, i) => (
                  <View key={w.id} style={styles.historyItem}>
                    <Text style={styles.historyWeight}>{w.weightKg} kg</Text>
                    <Text style={styles.historyDate}>{formatDate(w.date)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logBtn}
              onPress={handleLog}
              activeOpacity={0.8}
              testID="submit-weight"
            >
              <Text style={styles.logBtnText}>Log Weight</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  lastWeighIn: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  weightInput: {
    fontSize: 56,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    minWidth: 200,
  },
  unit: {
    fontSize: 22,
    color: Colors.textSecondary,
    fontWeight: '400' as const,
    marginTop: -4,
  },
  diffText: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 12,
  },
  diffDown: {
    color: Colors.success,
  },
  diffUp: {
    color: Colors.secondary,
  },
  infoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    marginTop: 32,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.divider,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  historySection: {
    width: '100%',
    marginTop: 24,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  logBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
