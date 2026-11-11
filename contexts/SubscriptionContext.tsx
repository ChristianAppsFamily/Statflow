import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  useIAP,
  getAvailablePurchases as fetchAvailablePurchases,
  type Purchase,
} from 'expo-iap';
import { setAdFreeEntitlement } from '@/services/ads';

const PRODUCT_ID = 'com.christianappempire.statflowapppremium';

function log(...args: unknown[]) {
  if (__DEV__) console.log(...args);
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isAdFree, setIsAdFree] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const purchaseWaiterRef = useRef<{
    resolve: (ok: boolean) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const applyAdFree = useCallback((value: boolean) => {
    setIsAdFree(value);
    setAdFreeEntitlement(value);
  }, []);

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    getAvailablePurchases,
    requestPurchase,
    restorePurchases: restoreIapPurchases,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: (purchase: Purchase) => {
      log('[StoreKit] Purchase success callback:', purchase.productId);
      void (async () => {
        try {
          if (purchase.productId === PRODUCT_ID) {
            applyAdFree(true);
            setIsPurchasing(false);
            try {
              await finishTransaction({ purchase, isConsumable: false });
            } catch (e) {
              log('[StoreKit] finishTransaction error:', e);
            }
            purchaseWaiterRef.current?.resolve(true);
            purchaseWaiterRef.current = null;
          }
        } catch (e) {
          log('[StoreKit] Purchase success handler error:', e);
          purchaseWaiterRef.current?.reject(
            e instanceof Error ? e : new Error('Purchase failed')
          );
          purchaseWaiterRef.current = null;
        }
      })();
    },
    onPurchaseError: (purchaseError) => {
      log('[StoreKit] Purchase error callback:', purchaseError);
      setIsPurchasing(false);
      setError(purchaseError.message || 'Purchase failed. Please try again.');
      purchaseWaiterRef.current?.reject(
        new Error(purchaseError.message || 'Purchase failed')
      );
      purchaseWaiterRef.current = null;
    },
    onError: (err: Error) => {
      log('[StoreKit] General error callback:', err);
      setError(err.message || 'An error occurred. Please try again.');
    },
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        setError(null);
        if (!connected) return;

        log('[StoreKit] Fetching products for ID:', PRODUCT_ID);
        await fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' });
      } catch (e) {
        log('[StoreKit] Init error:', e);
        setError('Failed to initialize purchases. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, [connected, fetchProducts]);

  useEffect(() => {
    if (!connected || products.length === 0) return;

    const checkPurchases = async () => {
      try {
        await getAvailablePurchases();
      } catch (e) {
        log('[StoreKit] Error checking purchases:', e);
      }
    };

    void checkPurchases();
  }, [connected, products, getAvailablePurchases]);

  useEffect(() => {
    const hasPremium = availablePurchases.some((p) => p.productId === PRODUCT_ID);
    if (hasPremium) {
      applyAdFree(true);
      log('[StoreKit] Premium purchase found');
    }
  }, [availablePurchases, applyAdFree]);

  const product = useMemo(() => {
    return products.find((p) => p.id === PRODUCT_ID) || null;
  }, [products]);

  const purchaseNoAds = useCallback(async () => {
    if (!product) {
      throw new Error('No package available. Please try again later.');
    }

    log('[StoreKit] Starting purchase for:', PRODUCT_ID);
    setIsPurchasing(true);
    setError(null);

    return new Promise<boolean>((resolve, reject) => {
      purchaseWaiterRef.current = { resolve, reject };

      void requestPurchase({
        request: {
          ios: { sku: PRODUCT_ID },
          android: { skus: [PRODUCT_ID] },
        },
        type: 'in-app',
      }).catch((err) => {
        setIsPurchasing(false);
        purchaseWaiterRef.current = null;
        reject(err instanceof Error ? err : new Error('Purchase failed'));
      });
    });
  }, [product, requestPurchase]);

  const restorePurchases = useCallback(async () => {
    log('[StoreKit] Restoring purchases...');
    setIsRestoring(true);
    setError(null);

    try {
      await restoreIapPurchases();
      // Prefer module API that returns the purchase list (hook state is stale after await)
      let purchases: Purchase[] = [];
      try {
        purchases = await fetchAvailablePurchases();
      } catch {
        await getAvailablePurchases();
        purchases = availablePurchases;
      }

      const hasPremium = purchases.some((p) => p.productId === PRODUCT_ID);
      if (hasPremium) {
        applyAdFree(true);
        log('[StoreKit] Premium restored');
      } else {
        log('[StoreKit] No premium purchase found to restore');
      }

      return {
        entitlements: {
          active: hasPremium ? { no_ads: true } : {},
        },
      };
    } catch (err) {
      log('[StoreKit] Restore error:', err);
      throw err;
    } finally {
      setIsRestoring(false);
    }
  }, [restoreIapPurchases, getAvailablePurchases, availablePurchases, applyAdFree]);

  const lifetimePackage = useMemo(() => {
    if (!product) return null;
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
