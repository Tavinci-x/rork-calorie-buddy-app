import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated, Platform, KeyboardAvoidingView, Easing } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Camera, ImageIcon, Cat, Sparkles, RefreshCw, Star, PartyPopper, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { calculateDailyTarget } from '@/utils/calculations';
import { convertToCartoon, LOADING_MESSAGES, MAX_GENERATION_ATTEMPTS } from '@/utils/cartoonify';
import { type ActivityLevel, ACTIVITY_LEVELS } from '@/types';

const TOTAL_STEPS = 9;

function LoadingOverlay() {
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2500);

    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 15000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    const sparkle = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(sparkleAnim, { toValue: 0, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    sparkle.start();

    return () => {
      clearInterval(interval);
      sparkle.stop();
    };
  }, [progressAnim, sparkleAnim, fadeAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.2, 0.8],
  });

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={loadStyles.container}>
      <Animated.View style={{ transform: [{ scale: sparkleScale }, { rotate: sparkleRotate }] }}>
        <View style={loadStyles.iconCircle}>
          <Sparkles size={36} color={Colors.primary} />
        </View>
      </Animated.View>

      <Animated.Text style={[loadStyles.message, { opacity: fadeAnim }]}>
        {LOADING_MESSAGES[messageIndex]}
      </Animated.Text>

      <View style={loadStyles.progressTrack}>
        <Animated.View style={[loadStyles.progressFill, { width: progressWidth }]} />
      </View>

      <Text style={loadStyles.hint}>This usually takes 10-15 seconds</Text>
    </View>
  );
}

interface RevealProps {
  originalUri: string;
  generatedBase64: string;
  onAccept: () => void;
  onRetry: () => void;
  attemptsLeft: number;
}

function RevealScreen({ originalUri, generatedBase64, onAccept, onRetry, attemptsLeft }: RevealProps) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(confettiAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim, confettiAnim]);

  return (
    <View style={revealStyles.container}>
      <Text style={revealStyles.title}>Meet your pixel Buddy!</Text>

      <View style={revealStyles.compareRow}>
        <View style={revealStyles.imageCard}>
          <Image source={{ uri: originalUri }} style={revealStyles.originalImage} contentFit="cover" />
          <Text style={revealStyles.imageLabel}>Original</Text>
        </View>

        <View style={revealStyles.arrowContainer}>
          <Text style={revealStyles.arrow}>→</Text>
        </View>

        <Animated.View style={[revealStyles.imageCard, revealStyles.resultCard, {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }]}>
          <Image
            source={{ uri: `data:image/png;base64,${generatedBase64}` }}
            style={revealStyles.resultImage}
            contentFit="contain"
          />
          <Text style={revealStyles.imageLabel}>Pixel Art</Text>
        </Animated.View>
      </View>

      <View style={revealStyles.buttons}>
        <TouchableOpacity style={revealStyles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
          <Text style={revealStyles.acceptText}>Love it!</Text>
        </TouchableOpacity>
        {attemptsLeft > 0 && (
          <TouchableOpacity style={revealStyles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
            <RefreshCw size={16} color={Colors.textSecondary} />
            <Text style={revealStyles.retryText}>Try Again ({attemptsLeft} left)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

interface CompletionProps {
  buddyImageBase64: string | null;
  goalType: 'gain' | 'lose';
}

function CompletionScreen({ buddyImageBase64, goalType }: CompletionProps) {
  const mascotScale = useRef(new Animated.Value(0)).current;
  const mascotRotate = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;
  const star4 = useRef(new Animated.Value(0)).current;
  const star5 = useRef(new Animated.Value(0)).current;
  const star6 = useRef(new Animated.Value(0)).current;
  const sparkleLoop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(mascotScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.timing(mascotRotate, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]),
      Animated.stagger(80, [
        Animated.spring(star1, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(star2, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(star3, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(star4, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(star5, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.spring(star6, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      ]),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();

    const sparkle = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleLoop, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(sparkleLoop, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    sparkle.start();

    return () => { pulse.stop(); sparkle.stop(); };
  }, [mascotScale, mascotRotate, glowAnim, titleOpacity, subtitleOpacity, star1, star2, star3, star4, star5, star6, sparkleLoop]);

  const rotate = mascotRotate.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-8deg', '4deg', '0deg'] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const sparkleRotate = sparkleLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const starPositions = [
    { top: -10, left: -10, size: 22, color: '#FFD700', anim: star1 },
    { top: -15, right: -5, size: 18, color: '#FF6B6B', anim: star2 },
    { top: 40, left: -25, size: 16, color: '#60A5FA', anim: star3 },
    { top: 50, right: -20, size: 20, color: '#4ADE80', anim: star4 },
    { bottom: 10, left: 5, size: 14, color: '#FBBF24', anim: star5 },
    { bottom: 5, right: 10, size: 17, color: '#F472B6', anim: star6 },
  ];

  const imageSource = buddyImageBase64
    ? { uri: `data:image/png;base64,${buddyImageBase64}` }
    : { uri: 'https://r2-pub.rork.com/generated-images/51c67409-5a49-45eb-956c-4d66a2fd0c8b.png' };

  return (
    <View style={completionStyles.container}>
      <View style={completionStyles.mascotArea}>
        <Animated.View style={[completionStyles.glowRing, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />

        <Animated.View style={{ transform: [{ scale: mascotScale }, { rotate }] }}>
          <View style={completionStyles.mascotFrame}>
            <Image
              source={imageSource}
              style={completionStyles.mascotImage}
              contentFit="contain"
            />
          </View>
        </Animated.View>

        {starPositions.map((pos, i) => (
          <Animated.View
            key={i}
            style={[
              completionStyles.starAbsolute,
              {
                top: pos.top,
                left: pos.left,
                right: pos.right,
                bottom: pos.bottom,
                transform: [{ scale: pos.anim }],
                opacity: pos.anim,
              } as any,
            ]}
          >
            <Star size={pos.size} color={pos.color} fill={pos.color} />
          </Animated.View>
        ))}

        <Animated.View style={[completionStyles.sparkleTopRight, { transform: [{ rotate: sparkleRotate }] }]}>
          <Sparkles size={24} color="#FFD700" />
        </Animated.View>
        <Animated.View style={[completionStyles.sparkleBottomLeft, { transform: [{ rotate: sparkleRotate }, { scaleX: -1 }] }]}>
          <Sparkles size={20} color="#FF6B6B" />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: titleOpacity, alignItems: 'center' as const }}>
        <View style={completionStyles.badgeRow}>
          <PartyPopper size={22} color="#FF9500" />
          <Text style={completionStyles.badge}>ALL SET!</Text>
          <PartyPopper size={22} color="#FF9500" />
        </View>
        <Text style={completionStyles.title}>
          {buddyImageBase64 ? 'Your Pixel Cat is Ready!' : "Let's Crush It!"}
        </Text>
      </Animated.View>

      <Animated.View style={{ opacity: subtitleOpacity, alignItems: 'center' as const }}>
        <Text style={completionStyles.subtitle}>
          {buddyImageBase64
            ? 'Your custom cat mascot will cheer you on!'
            : goalType === 'lose'
              ? 'Time to start your journey to a healthier you!'
              : 'Time to fuel up and build some gains!'}
        </Text>
        <View style={completionStyles.featureRow}>
          <View style={completionStyles.featureChip}>
            <Heart size={14} color="#FF6B6B" fill="#FF6B6B" />
            <Text style={completionStyles.featureText}>Track meals</Text>
          </View>
          <View style={completionStyles.featureChip}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={completionStyles.featureText}>Build streaks</Text>
          </View>
          <View style={completionStyles.featureChip}>
            <Sparkles size={14} color="#4ADE80" />
            <Text style={completionStyles.featureText}>Level up</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const completionStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 24,
  },
  mascotArea: {
    width: 240,
    height: 240,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  glowRing: {
    position: 'absolute' as const,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FFD700',
  },
  mascotFrame: {
    width: 200,
    height: 200,
    borderRadius: 32,
    overflow: 'hidden' as const,
    backgroundColor: '#FFF9E6',
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  mascotImage: {
    width: 194,
    height: 194,
  },
  starAbsolute: {
    position: 'absolute' as const,
  },
  sparkleTopRight: {
    position: 'absolute' as const,
    top: -20,
    right: -15,
  },
  sparkleBottomLeft: {
    position: 'absolute' as const,
    bottom: -10,
    left: -15,
  },
  badgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#FF9500',
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  featureRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 20,
  },
  featureChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateProfile } = useApp();
  const [step, setStep] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState<string>('');
  const [goalType, setGoalType] = useState<'gain' | 'lose'>('lose');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [age, setAge] = useState<string>('25');
  const [height, setHeight] = useState<string>('170');
  const [weight, setWeight] = useState<string>('70');
  const [goalWeight, setGoalWeight] = useState<string>('65');
  const [months, setMonths] = useState<string>('3');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [calorieAdjust, setCalorieAdjust] = useState<number>(0);

  const [catPhotoUri, setCatPhotoUri] = useState<string | null>(null);
  const [buddyImageBase64, setBuddyImageBase64] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [showReveal, setShowReveal] = useState<boolean>(false);

  const calculatedTarget = calculateDailyTarget({
    currentWeightKg: parseFloat(weight) || 70,
    heightCm: parseFloat(height) || 170,
    age: parseInt(age) || 25,
    gender,
    goalType,
    activityLevel,
  });

  const finalTarget = calculatedTarget + calorieAdjust;

  const animateTransition = useCallback((direction: number, callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: direction * -50, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction * 50);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const nextStep = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) {
      animateTransition(1, () => setStep(s => s + 1));
    } else {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + (parseInt(months) || 3));
      updateProfile({
        name: name.trim() || 'MeowCal User',
        goalType,
        gender,
        age: parseInt(age) || 25,
        heightCm: parseFloat(height) || 170,
        currentWeightKg: parseFloat(weight) || 70,
        startWeightKg: parseFloat(weight) || 70,
        goalWeightKg: parseFloat(goalWeight) || 65,
        activityLevel,
        dailyCalorieTarget: finalTarget,
        startDate: new Date().toISOString().split('T')[0],
        targetDate: targetDate.toISOString().split('T')[0],
        buddyColor: Colors.buddyDefault,
        buddyImageBase64: buddyImageBase64 || undefined,
        mascotGenerationCount: generationCount,
        onboardingComplete: true,
      });
      router.replace('/(tabs)/(home)' as any);
    }
  }, [step, animateTransition, name, goalType, gender, age, height, weight, goalWeight, months, finalTarget, buddyImageBase64, activityLevel, updateProfile, router, generationCount]);

  const prevStep = useCallback(() => {
    if (step > 0) {
      animateTransition(-1, () => setStep(s => s - 1));
    }
  }, [step, animateTransition]);

  const pickCatPhoto = useCallback(async (source: 'camera' | 'library') => {
    if (generationCount >= MAX_GENERATION_ATTEMPTS) {
      setConvertError(`You've used all ${MAX_GENERATION_ATTEMPTS} attempts. You can skip or create manually.`);
      return;
    }

    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [1, 1],
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [1, 1],
          base64: true,
        });
      }
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCatPhotoUri(asset.uri);
        setConvertError(null);
        setShowReveal(false);
        setIsConverting(true);
        try {
          let imageBase64 = asset.base64;
          if (!imageBase64) {
            const resp = await fetch(asset.uri);
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
          const cartoon = await convertToCartoon(imageBase64);
          setBuddyImageBase64(cartoon);
          setGenerationCount(c => c + 1);
          setShowReveal(true);
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
          console.log('Cartoon conversion error:', err);
          setConvertError("Oops! Our pixel art machine is taking a cat nap. Try again or skip.");
        } finally {
          setIsConverting(false);
        }
      }
    } catch (err) {
      console.log('Image picker error:', err);
    }
  }, [generationCount]);

  const handleAcceptMascot = useCallback(() => {
    setShowReveal(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleRetryMascot = useCallback(() => {
    setShowReveal(false);
    setBuddyImageBase64(null);
    setCatPhotoUri(null);
  }, []);

  const renderProgressDots = () => (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotCompleted]}
        />
      ))}
    </View>
  );

  const getNextButtonText = () => {
    if (step === TOTAL_STEPS - 1) return "Let's Start!";
    if (step === 2 && !buddyImageBase64 && !isConverting) return 'Skip';
    return 'Continue';
  };

  const attemptsLeft = MAX_GENERATION_ATTEMPTS - generationCount;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepCenter}>
            <View style={styles.heroImageContainer}>
              <Image
                source={{ uri: 'https://r2-pub.rork.com/generated-images/51c67409-5a49-45eb-956c-4d66a2fd0c8b.png' }}
                style={styles.heroImage}
                contentFit="contain"
              />
            </View>
            <Text style={styles.title}>Welcome to MeowCal!</Text>
            <Text style={styles.subtitle}>
              Your pixel cat crew is here to help{"\n"}you crush your calorie goals!
            </Text>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepCenter}>
            <Text style={styles.title}>What&apos;s your name?</Text>
            <Text style={styles.subtitle}>Your cat will know who to cheer for</Text>
            <View style={[styles.inputGroup, { width: '100%', marginTop: 32 }]}>
              <TextInput
                style={[styles.input, { textAlign: 'center' as const, fontSize: 22 }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={nextStep}
                testID="input-name"
              />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepCenter}>
            {isConverting ? (
              <LoadingOverlay />
            ) : showReveal && buddyImageBase64 && catPhotoUri ? (
              <RevealScreen
                originalUri={catPhotoUri}
                generatedBase64={buddyImageBase64}
                onAccept={handleAcceptMascot}
                onRetry={handleRetryMascot}
                attemptsLeft={attemptsLeft}
              />
            ) : buddyImageBase64 ? (
              <View style={styles.previewContainer}>
                <Text style={styles.title}>Your Pixel Buddy</Text>
                <View style={styles.previewCard}>
                  <Image
                    source={{ uri: `data:image/png;base64,${buddyImageBase64}` }}
                    style={styles.previewImage}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.previewLabel}>Looking great!</Text>
                {attemptsLeft > 0 && (
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => { setBuddyImageBase64(null); setCatPhotoUri(null); }}
                  >
                    <Text style={styles.retakeText}>Try a different photo ({attemptsLeft} left)</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.title}>Make Buddy Yours</Text>
                <Text style={styles.subtitle}>
                  Take a photo of your cat and we&apos;ll turn it{'\n'}into a pixel art mascot!
                </Text>
                <View style={styles.photoOptions}>
                  {catPhotoUri && convertError ? (
                    <Text style={styles.errorText}>{convertError}</Text>
                  ) : null}
                  {!catPhotoUri && convertError ? (
                    <Text style={styles.errorText}>{convertError}</Text>
                  ) : null}
                  <View style={styles.photoButtonsRow}>
                    <TouchableOpacity
                      style={[styles.photoBtn, generationCount >= MAX_GENERATION_ATTEMPTS && styles.photoBtnDisabled]}
                      onPress={() => pickCatPhoto('camera')}
                      activeOpacity={0.8}
                      disabled={generationCount >= MAX_GENERATION_ATTEMPTS}
                    >
                      <View style={styles.photoBtnIcon}>
                        <Camera size={28} color={generationCount >= MAX_GENERATION_ATTEMPTS ? Colors.textMuted : Colors.text} />
                      </View>
                      <Text style={styles.photoBtnLabel}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoBtn, generationCount >= MAX_GENERATION_ATTEMPTS && styles.photoBtnDisabled]}
                      onPress={() => pickCatPhoto('library')}
                      activeOpacity={0.8}
                      disabled={generationCount >= MAX_GENERATION_ATTEMPTS}
                    >
                      <View style={styles.photoBtnIcon}>
                        <ImageIcon size={28} color={generationCount >= MAX_GENERATION_ATTEMPTS ? Colors.textMuted : Colors.text} />
                      </View>
                      <Text style={styles.photoBtnLabel}>From Gallery</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.catHintContainer}>
                    <Cat size={18} color={Colors.textSecondary} />
                    <Text style={styles.catHint}>Best with a clear front-facing cat photo</Text>
                  </View>
                  {generationCount > 0 && (
                    <Text style={styles.attemptsText}>
                      {attemptsLeft} of {MAX_GENERATION_ATTEMPTS} attempts remaining
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        );
      case 3:
        return (
          <View style={styles.stepCenter}>
            <Text style={styles.title}>What&apos;s your goal?</Text>
            <Text style={styles.subtitle}>Buddy will evolve with your progress</Text>
            <View style={styles.goalCards}>
              <TouchableOpacity
                style={[styles.goalCard, goalType === 'lose' && styles.goalCardActive]}
                onPress={() => { setGoalType('lose'); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
                testID="goal-lose"
              >
                <TrendingDown color={goalType === 'lose' ? Colors.text : Colors.textSecondary} size={32} />
                <Text style={[styles.goalText, goalType === 'lose' && styles.goalTextActive]}>Lose Weight</Text>
                <Text style={styles.goalDesc}>Cut calories & get lean</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.goalCard, goalType === 'gain' && styles.goalCardActive]}
                onPress={() => { setGoalType('gain'); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
                testID="goal-gain"
              >
                <TrendingUp color={goalType === 'gain' ? Colors.text : Colors.textSecondary} size={32} />
                <Text style={[styles.goalText, goalType === 'gain' && styles.goalTextActive]}>Gain Weight</Text>
                <Text style={styles.goalDesc}>Build mass & strength</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 4:
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.stepFill}>
            <ScrollView contentContainerStyle={styles.stepScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>About You</Text>
              <Text style={styles.subtitle}>We&apos;ll use this to calculate your plan</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor={Colors.textMuted}
                  testID="input-age"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  placeholder="170"
                  placeholderTextColor={Colors.textMuted}
                  testID="input-height"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="70"
                  placeholderTextColor={Colors.textMuted}
                  testID="input-weight"
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        );
      case 5:
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.stepFill}>
            <ScrollView contentContainerStyle={styles.stepScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Your Target</Text>
              <Text style={styles.subtitle}>Where do you want to be?</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Goal Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={goalWeight}
                  onChangeText={setGoalWeight}
                  keyboardType="decimal-pad"
                  placeholder="65"
                  placeholderTextColor={Colors.textMuted}
                  testID="input-goal-weight"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Timeframe (months)</Text>
                <View style={styles.monthRow}>
                  {['1', '2', '3', '4', '5', '6'].map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthBtn, months === m && styles.monthBtnActive]}
                      onPress={() => setMonths(m)}
                    >
                      <Text style={[styles.monthText, months === m && styles.monthTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        );
      case 6:
        return (
          <View style={styles.stepFill}>
            <ScrollView contentContainerStyle={styles.stepScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>How active are you?</Text>
              <Text style={styles.subtitle}>This helps us calculate your daily needs</Text>
              <View style={styles.activityList}>
                {ACTIVITY_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level.key}
                    style={[styles.activityCard, activityLevel === level.key && styles.activityCardActive]}
                    onPress={() => { setActivityLevel(level.key); setCalorieAdjust(0); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
                    testID={`activity-${level.key}`}
                  >
                    <View style={styles.activityRadio}>
                      {activityLevel === level.key && <View style={styles.activityRadioInner} />}
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityLabel, activityLevel === level.key && styles.activityLabelActive]}>{level.label}</Text>
                      <Text style={styles.activityDesc}>{level.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        );
      case 7:
        return (
          <View style={styles.stepCenter}>
            <Text style={styles.title}>Your Calorie Plan</Text>
            <Text style={styles.subtitle}>Based on your stats, we recommend</Text>
            <View style={styles.calorieCard}>
              <Text style={styles.calorieNumber}>{finalTarget}</Text>
              <Text style={styles.calorieUnit}>calories / day</Text>
            </View>
            <View style={styles.adjustRow}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setCalorieAdjust(a => a - 100)}
              >
                <Text style={styles.adjustText}>-100</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustBtnReset}
                onPress={() => setCalorieAdjust(0)}
              >
                <Text style={styles.adjustResetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setCalorieAdjust(a => a + 100)}
              >
                <Text style={styles.adjustText}>+100</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.adjustHint}>
              {goalType === 'lose' ? 'TDEE - 500 cal deficit' : 'TDEE + 500 cal surplus'}
              {calorieAdjust !== 0 ? ` (${calorieAdjust > 0 ? '+' : ''}${calorieAdjust} adjusted)` : ''}
            </Text>
          </View>
        );
      case 8:
        return (
          <CompletionScreen
            buddyImageBase64={buddyImageBase64}
            goalType={goalType}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            {step > 0 ? (
              <TouchableOpacity onPress={prevStep} style={styles.backBtn} testID="onboarding-back">
                <ChevronLeft color={Colors.textSecondary} size={24} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtn} />
            )}
            {renderProgressDots()}
            <View style={styles.backBtn} />
          </View>
          <Animated.View
            style={[styles.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
          >
            {renderStep()}
          </Animated.View>
          {!(step === 2 && (isConverting || showReveal)) && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.nextBtn, isConverting && styles.nextBtnDisabled]}
                onPress={isConverting ? undefined : nextStep}
                activeOpacity={isConverting ? 1 : 0.8}
                testID="onboarding-next"
              >
                <Text style={styles.nextBtnText}>
                  {getNextButtonText()}
                </Text>
                {step < TOTAL_STEPS - 1 && !isConverting && <ChevronRight color={Colors.white} size={20} />}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    </>
  );
}

const loadStyles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flex: 1,
    paddingHorizontal: 32,
    gap: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  message: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    minHeight: 50,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.progressTrack,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});

const revealStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 8,
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  compareRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
  },
  imageCard: {
    alignItems: 'center' as const,
    gap: 8,
  },
  originalImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: Colors.background,
  },
  resultCard: {},
  resultImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  imageLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  arrowContainer: {
    paddingHorizontal: 4,
  },
  arrow: {
    fontSize: 24,
    color: Colors.textMuted,
  },
  buttons: {
    width: '100%',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  acceptText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  retryBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    gap: 8,
  },
  retryText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.progressTrack,
  },
  dotActive: {
    backgroundColor: Colors.text,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: Colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepFill: {
    flex: 1,
  },
  stepScroll: {
    paddingTop: 32,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 22,
  },
  goalCards: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 32,
    width: '100%',
  },
  goalCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardActive: {
    borderColor: Colors.text,
    backgroundColor: Colors.white,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  goalTextActive: {
    color: Colors.text,
  },
  goalDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  genderRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 24,
    marginBottom: 20,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: Colors.text,
  },
  genderText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  genderTextActive: {
    color: Colors.white,
    fontWeight: '600' as const,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  monthRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  monthBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  monthBtnActive: {
    backgroundColor: Colors.text,
  },
  monthText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  monthTextActive: {
    color: Colors.white,
  },
  heroImageContainer: {
    width: 260,
    height: 260,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  heroImage: {
    width: 260,
    height: 260,
  },
  calorieCard: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 28,
  },
  calorieNumber: {
    fontSize: 52,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  calorieUnit: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  adjustRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  adjustBtn: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  adjustBtnReset: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  adjustText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  adjustResetText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  adjustHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 12,
    textAlign: 'center' as const,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  nextBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 6,
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  activityList: {
    marginTop: 20,
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 14,
  },
  activityCardActive: {
    borderColor: Colors.text,
    backgroundColor: Colors.white,
  },
  activityRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.text,
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  activityLabelActive: {
    color: Colors.text,
  },
  nameInput: {
    width: '100%',
    marginTop: 28,
    fontSize: 22,
    textAlign: 'center' as const,
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: Colors.text,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  activityDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  previewContainer: {
    alignItems: 'center' as const,
    marginTop: 16,
  },
  previewCard: {
    width: 200,
    height: 200,
    borderRadius: 24,
    overflow: 'hidden' as const,
    marginTop: 16,
  },
  previewImage: {
    width: 200,
    height: 200,
  },
  previewLabel: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  retakeBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  retakeText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  photoOptions: {
    alignItems: 'center' as const,
    marginTop: 32,
    width: '100%',
  },
  photoButtonsRow: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 20,
  },
  photoBtn: {
    width: 140,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center' as const,
  },
  photoBtnDisabled: {
    opacity: 0.4,
  },
  photoBtnIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  photoBtnLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  catHintContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  catHint: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  attemptsText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
});
