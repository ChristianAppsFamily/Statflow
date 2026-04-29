import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  useIAP,
  type Product,
  type Purchase,
} from 'expo-iap';

const PRODUCT_ID = 'com.christianappempire.statflowapp.premium';

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isAdFree, setIsAdFree] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    getAvailablePurchases,
    requestPurchase,
    restorePurchases: restoreIapPurchases,
  } = useIAP({
    onPurchaseSuccess: (purchase: Purchase) => {
      console.log('[StoreKit] Purchase success callback:', purchase.productId);
      if (purchase.productId === PRODUCT_ID) {
        setIsAdFree(true);
        setIsPurchasing(false);
      }
    },
    onPurchaseError: (error) => {
      console.error('[StoreKit] Purchase error callback:', error);
      setIsPurchasing(false);
      setError(error.message || 'Purchase failed. Please try again.');
    },
    onError: (error: Error) => {
      console.error('[StoreKit] General error callback:', error);
      setError(error.message || 'An error occurred. Please try again.');
    },
  });

  // Initialize products on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        setError(null);
        console.log('[StoreKit] Initializing... Connected:', connected);
        
        if (!connected) {
          console.log('[StoreKit] Not connected yet, waiting...');
          return;
        }

        // Fetch products
        console.log('[StoreKit] Fetching products for ID:', PRODUCT_ID);
        await fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' });
        console.log('[StoreKit] Products fetch initiated');
      } catch (e) {
        console.error('[StoreKit] Init error:', e);
        setError('Failed to initialize purchases. Please try again.');
        setIsLoading(false);
      }
    };

    void init();
  }, [connected, fetchProducts]);

  // Check for existing purchases when products load
  useEffect(() => {
    const checkPurchases = async () => {
      try {
        console.log('[StoreKit] Checking for existing purchases...');
        await getAvailablePurchases();
      } catch (e) {
        console.error('[StoreKit] Error checking purchases:', e);
      }
    };

    if (connected && products.length > 0) {
      console.log('[StoreKit] Products loaded:', products.map(p => p.id));
      void checkPurchases();
      setIsLoading(false);
    }
  }, [connected, products, getAvailablePurchases]);

  // Update ad-free status when purchases change
  useEffect(() => {
    const hasPremium = availablePurchases.some(
      (p) => p.productId === PRODUCT_ID
    );
    if (hasPremium) {
      setIsAdFree(true);
      console.log('[StoreKit] Premium purchase found');
    }
  }, [availablePurchases]);

  const product = useMemo(() => {
    return products.find(p => p.id === PRODUCT_ID) || null;
  }, [products]);

  const purchaseNoAds = useCallback(async () => {
    if (!product) {
      console.error('[StoreKit] Purchase attempted but no product available');
      throw new Error('No package available. Please try again later.');
    }
    
    console.log('[StoreKit] Starting purchase for:', PRODUCT_ID);
    setIsPurchasing(true);
    setError(null);
    
    try {
      await requestPurchase({
        request: {
          ios: { sku: PRODUCT_ID },
          android: { skus: [PRODUCT_ID] },
        },
        type: 'in-app',
      });
      console.log('[StoreKit] Purchase request sent');
      // Note: Success is handled by onPurchaseSuccess callback
    } catch (error) {
      console.error('[StoreKit] Purchase request error:', error);
      setIsPurchasing(false);
      throw error;
    }
  }, [product, requestPurchase]);

  const restorePurchases = useCallback(async () => {
    console.log('[StoreKit] Restoring purchases...');
    setIsRestoring(true);
    setError(null);
    
    try {
      await restoreIapPurchases();
      await getAvailablePurchases();
      
      const hasPremium = availablePurchases.some(
        (p) => p.productId === PRODUCT_ID
      );
      
      if (hasPremium) {
        setIsAdFree(true);
        console.log('[StoreKit] Premium restored');
      } else {
        console.log('[StoreKit] No premium purchase found to restore');
      }
      
      setIsRestoring(false);
      return {
        entitlements: {
          active: hasPremium ? { no_ads: true } : {},
        },
      };
    } catch (error) {
      console.error('[StoreKit] Restore error:', error);
      setIsRestoring(false);
      throw error;
    }
  }, [restoreIapPurchases, getAvailablePurchases, availablePurchases]);

  const lifetimePackage = useMemo(() => {
    if (!product) return null;
    // Product type can be ProductIOS or ProductAndroid
    // Both have displayPrice for showing the price
    return {
      product: {
        priceString: product.displayPrice ?? '$4.99',
      },
    };
  }, [product]);

  return useMemo(() => ({
    isAdFree,
    isLoading,
    isPurchasing,
    isRestoring,
    purchaseError: error,
    restoreError: null,
    lifetimePackage,
    offering: null,
    purchaseNoAds,
    restorePurchases,
  }), [
    isAdFree,
    isLoading,
    isPurchasing,
    isRestoring,
    error,
    lifetimePackage,
    purchaseNoAds,
    restorePurchases,
  ]);
});
