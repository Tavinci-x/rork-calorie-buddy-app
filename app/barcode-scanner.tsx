import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, ScanBarcode } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { getTodayDate } from '@/utils/helpers';
import { type MealType } from '@/types';

interface ProductInfo {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  brand?: string;
}

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const { addMeal } = useApp();
  const [barcode, setBarcode] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [servings, setServings] = useState<string>('1');
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();

  const startScanner = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Barcode scanning is not available on web. Please enter the barcode manually.');
      return;
    }

    try {
      const result = await requestPermission();

      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to scan barcodes.');
        return;
      }

      setScannerActive(true);
    } catch (e) {
      console.log('Error starting scanner:', e);
      Alert.alert('Error', 'Could not start barcode scanner.');
    }
  }, [requestPermission]);

  const handleBarcodeScanned = useCallback((result: { data: string; type: string }) => {
    console.log('Barcode scanned:', result);
    setScannerActive(false);
    setBarcode(result.data);
    lookupBarcode(result.data);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const lookupBarcode = useCallback(async (code: string) => {
    setIsLookingUp(true);
    setProduct(null);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = p.nutriments || {};
        const productInfo: ProductInfo = {
          name: p.product_name || p.product_name_en || 'Unknown Product',
          calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
          proteinG: Math.round((nutriments.proteins_100g || nutriments.proteins || 0) * 10) / 10,
          carbsG: Math.round((nutriments.carbohydrates_100g || nutriments.carbohydrates || 0) * 10) / 10,
          fatG: Math.round((nutriments.fat_100g || nutriments.fat || 0) * 10) / 10,
          brand: p.brands || undefined,
        };
        setProduct(productInfo);
        console.log('Product found:', productInfo);
      } else {
        Alert.alert('Not Found', 'Product not found in the database. Please try entering manually.');
      }
    } catch (e) {
      console.log('Error looking up barcode:', e);
      Alert.alert('Lookup Failed', 'Could not look up the barcode. Please check your connection.');
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  const handleManualLookup = useCallback(() => {
    if (!barcode.trim()) {
      Alert.alert('Enter Barcode', 'Please enter a barcode number.');
      return;
    }
    lookupBarcode(barcode.trim());
  }, [barcode, lookupBarcode]);

  const handleConfirm = useCallback(() => {
    if (!product) return;

    const numServings = parseFloat(servings) || 1;
    const finalCalories = Math.round(product.calories * numServings);
    const finalProtein = Math.round(product.proteinG * numServings * 10) / 10;
    const finalCarbs = Math.round(product.carbsG * numServings * 10) / 10;
    const finalFat = Math.round(product.fatG * numServings * 10) / 10;

    addMeal({
      date: getTodayDate(),
      mealType: 'snack' as MealType,
      name: product.name,
      calories: finalCalories,
      proteinG: finalProtein,
      carbsG: finalCarbs,
      fatG: finalFat,
    });

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [product, servings, addMeal, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Barcode Scanner</Text>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
          </View>

          {scannerActive && permission?.granted && Platform.OS !== 'web' ? (
            <View style={styles.scannerContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.scannerOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>Point at a barcode</Text>
              </View>
              <TouchableOpacity
                style={styles.cancelScanBtn}
                onPress={() => setScannerActive(false)}
              >
                <Text style={styles.cancelScanText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {!product && (
                <>
                  <View style={styles.scanPrompt}>
                    <View style={styles.scanIconCircle}>
                      <ScanBarcode size={40} color={Colors.textSecondary} />
                    </View>
                    <Text style={styles.promptTitle}>Scan a barcode</Text>
                    <Text style={styles.promptSubtitle}>Look up nutrition from millions of products</Text>

                    {Platform.OS !== 'web' && (
                      <TouchableOpacity style={styles.primaryBtn} onPress={startScanner}>
                        <ScanBarcode size={20} color={Colors.white} />
                        <Text style={styles.primaryBtnText}>Open Scanner</Text>
                      </TouchableOpacity>
                    )}

                    <Text style={styles.orText}>or enter manually</Text>

                    <View style={styles.manualRow}>
                      <TextInput
                        style={styles.barcodeInput}
                        value={barcode}
                        onChangeText={setBarcode}
                        placeholder="Enter barcode number"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="number-pad"
                      />
                      <TouchableOpacity style={styles.lookupBtn} onPress={handleManualLookup}>
                        <Text style={styles.lookupBtnText}>Look up</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isLookingUp && (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={Colors.text} />
                      <Text style={styles.loadingText}>Looking up product...</Text>
                    </View>
                  )}
                </>
              )}

              {product && (
                <View style={styles.productSection}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}

                  <View style={styles.servingsRow}>
                    <Text style={styles.servingsLabel}>Number of Servings</Text>
                    <View style={styles.servingsInput}>
                      <TextInput
                        style={styles.servingsValue}
                        value={servings}
                        onChangeText={setServings}
                        keyboardType="decimal-pad"
                      />
                      <Text style={styles.servingsEdit}>✏️</Text>
                    </View>
                  </View>

                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                    <Text style={styles.nutritionValue}>
                      {Math.round(product.calories * (parseFloat(servings) || 1))}
                    </Text>
                  </View>

                  <View style={styles.macroCards}>
                    <View style={[styles.macroCard, { backgroundColor: Colors.proteinBg }]}>
                      <Text style={[styles.macroCardLabel, { color: Colors.protein }]}>Protein</Text>
                      <Text style={styles.macroCardValue}>
                        {Math.round(product.proteinG * (parseFloat(servings) || 1))}g
                      </Text>
                    </View>
                    <View style={[styles.macroCard, { backgroundColor: Colors.carbsBg }]}>
                      <Text style={[styles.macroCardLabel, { color: Colors.carbs }]}>Carbs</Text>
                      <Text style={styles.macroCardValue}>
                        {Math.round(product.carbsG * (parseFloat(servings) || 1))}g
                      </Text>
                    </View>
                    <View style={[styles.macroCard, { backgroundColor: Colors.fatBg }]}>
                      <Text style={[styles.macroCardLabel, { color: Colors.fat }]}>Fats</Text>
                      <Text style={styles.macroCardValue}>
                        {Math.round(product.fatG * (parseFloat(servings) || 1))}g
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.scanAgainBtn} onPress={() => { setProduct(null); setBarcode(''); }}>
                    <Text style={styles.scanAgainText}>Scan Another</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {product && !scannerActive && (
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
    zIndex: 10,
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
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanHint: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 20,
  },
  cancelScanBtn: {
    position: 'absolute' as const,
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelScanText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scanPrompt: {
    alignItems: 'center',
    paddingTop: 40,
  },
  scanIconCircle: {
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
    marginBottom: 20,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  orText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  manualRow: {
    flexDirection: 'row' as const,
    gap: 10,
    width: '100%',
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  lookupBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  lookupBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  loadingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  productSection: {
    paddingTop: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  servingsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  servingsLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  servingsInput: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  servingsValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center' as const,
  },
  servingsEdit: {
    fontSize: 14,
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
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scanAgainBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  scanAgainText: {
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
