# RevenueCat Setup Guide for StatFlow

## Current Status

✅ RevenueCat SDK installed and configured  
✅ Purchase UI implemented in Settings screen  
🚧 API keys need to be added to `.env`  
🚧 Product needs to be created in App Store Connect  
🚧 Offering needs to be configured in RevenueCat dashboard  

---

## What Needs to Be Done

### 1. Create RevenueCat Account & Project

1. Go to https://app.revenuecat.com/
2. Sign up or log in
3. Click **Create new project**
4. Project name: **StatFlow**
5. Select **iOS** platform
6. Click **Create**

### 2. Get Your API Keys

In RevenueCat dashboard:

1. Go to **Project Settings** → **API Keys**
2. You'll see three types of keys:
   - **Public API Key (App)** - Use for iOS production
   - **Public API Key (Sandbox)** - Use for testing
   - Secret API Key - Don't use this in the app!

3. Copy the **iOS Public API Key** (production)
4. Copy the **iOS Public SDK Key** or similar (sandbox/test mode)

### 3. Update `.env` File

Open `/expo/.env` and replace the placeholder keys:

```env
# RevenueCat API Keys

# Production key (for App Store builds)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_YourRealProductionKeyHere

# Android key (if you expand to Android later)
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_YourRealAndroidKeyHere

# Test/Development key (sandbox mode for testing)
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=appl_YourRealTestKeyHere
```

⚠️ **Never commit real API keys to Git!** Add `.env` to `.gitignore`.

---

## 4. Create Product in App Store Connect

### Step 1: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com/
2. Click **Apps** → **➕** (Add)
3. Fill in app details:
   - Platform: iOS
   - Name: StatFlow
   - Primary Language: English (US)
   - Bundle ID: `com.christianappempire.statflow`
   - SKU: `statflow-2026` (or similar)
4. Click **Create**

### Step 2: Create In-App Purchase Product
1. In your app, go to **In-App Purchases**
2. Click **➕** to add a new in-app purchase
3. Select **Non-Consumable** (one-time purchase)
4. Click **Create**

5. Fill in product details:
   - **Product ID:** `statflow_remove_ads_lifetime`  
     (This is the identifier — must match RevenueCat)
   - **Reference Name:** `Remove Ads - Lifetime`
   - **Price:** Tier 5 ($4.99) or your preferred price

6. **Localized Information:**
   - **Display Name:** `Remove Ads`
   - **Description:** `Remove all ads from StatFlow and support education. One-time purchase, no subscription.`

7. **Review Information:**
   - **Screenshot:** Upload a screenshot showing the Settings screen with purchase button
   - **Review Notes:** `This removes all ads from the app. Thank you for supporting student education!`

8. Click **Save**

9. **Submit for Review:**
   - Click **Submit for Review**
   - Wait for approval (can take 24-48 hours)

---

## 5. Configure RevenueCat Offering

### Step 1: Connect App Store Connect
1. In RevenueCat dashboard, go to **Project Settings** → **Apple App Store**
2. Click **Connect to App Store Connect**
3. Upload your App Store Connect API key (or use App Store Server API)
4. Select your app: **StatFlow**
5. Click **Save**

RevenueCat will automatically sync your in-app purchase products.

### Step 2: Create Entitlement
1. Go to **Entitlements**
2. Click **➕ New**
3. **Identifier:** `no_ads`  
   (This is what the app checks for — must match code!)
4. **Description:** `Removes all ads from the app`
5. Click **Save**

### Step 3: Create Product
1. Go to **Products**
2. Click **➕ New**
3. **Product ID:** `statflow_remove_ads_lifetime`  
   (Must match App Store Connect product ID)
4. **Type:** Non-Consumable
5. **Store:** App Store
6. Click **Save**

RevenueCat should automatically detect the product from App Store Connect if synced correctly.

### Step 4: Create Offering
1. Go to **Offerings**
2. Click **➕ New**
3. **Identifier:** `default`  
   (The app looks for the "current" offering, which is usually "default")
4. **Description:** `StatFlow lifetime ad removal`

5. Add package:
   - Click **➕ Add Package**
   - **Package ID:** `$rc_lifetime`  
     (This is a special RevenueCat identifier — the app looks for this!)
   - **Product:** Select `statflow_remove_ads_lifetime`
   - **Entitlement:** Select `no_ads`
   - Click **Save**

6. **Set as Current:**
   - Toggle **Set as current offering** to **ON**
   - Click **Save**

---

## 6. Test the Purchase Flow

### Option A: TestFlight
1. Build app with Xcode and upload to App Store Connect
2. Create TestFlight build
3. Invite yourself as internal tester
4. Install app via TestFlight
5. Test purchase (uses sandbox environment)

### Option B: Xcode Sandbox Testing
1. Go to Xcode → Preferences → Accounts
2. Add your Apple ID
3. Create a sandbox test account:
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create a new sandbox tester with a unique email
4. Build and run app in Xcode (Release mode)
5. When prompted to sign in to App Store, use sandbox tester account
6. Test purchase flow

**Expected Flow:**
1. Open app → Settings
2. Tap "Support Education - $4.99"
3. iOS payment sheet appears
4. Confirm purchase (sandbox = free)
5. Button changes to "Ad-Free Unlocked" with checkmark
6. All ads disappear immediately
7. Restart app → ads stay hidden

---

## 7. Test Restore Purchases

1. After purchasing, delete the app
2. Reinstall from TestFlight or Xcode
3. Open Settings
4. Tap "Restore Purchases"
5. Ad-free state should be restored
6. All ads should remain hidden

---

## 8. Production Checklist

Before going live:

- [ ] Real RevenueCat API keys in `.env`
- [ ] Product created in App Store Connect
- [ ] Product approved by Apple
- [ ] Offering configured in RevenueCat
- [ ] Entitlement `no_ads` created
- [ ] Package `$rc_lifetime` linked to product
- [ ] Tested purchase flow in TestFlight
- [ ] Tested restore purchases
- [ ] Verified ads disappear after purchase
- [ ] Verified ads stay hidden after app restart

---

## Troubleshooting

### Purchase Button Shows "No package available"
- Check RevenueCat dashboard: Is offering set as "current"?
- Check product ID matches exactly
- Check API key is correct in `.env`
- Restart app after changing `.env`

### Purchase Fails with Error
- Check sandbox account is signed in (Settings → App Store)
- Check product is approved in App Store Connect
- Check RevenueCat API key is correct
- Check logs in RevenueCat dashboard (Customers → Events)

### Restore Purchases Doesn't Work
- Make sure using same Apple ID as original purchase
- Check RevenueCat logs for restore event
- Try signing out/in to App Store

### Ads Still Show After Purchase
- Check console logs: `[RevenueCat]` and `[BannerAd]`
- Verify `isAdFree` is true (check SubscriptionContext logs)
- Make sure entitlement ID is exactly `no_ads`
- Restart app after purchase

---

## App Store Review Notes

When submitting to App Store:

**In App Review Notes:**
```
In-App Purchase Testing:
- Product ID: statflow_remove_ads_lifetime
- Description: Removes all ads from the app
- Price: $4.99 (one-time purchase)
- To test: Go to Settings → Support Education → Purchase

The purchase removes all banner and interstitial ads from the app.
It's a lifetime purchase with no subscription or recurring charges.

Sandbox test account credentials will be provided separately.
```

---

## Quick Reference

| Item | Value |
|------|-------|
| Product ID | `statflow_remove_ads_lifetime` |
| Package ID | `$rc_lifetime` |
| Entitlement ID | `no_ads` |
| Offering ID | `default` |
| Price | $4.99 (Tier 5) |
| Type | Non-Consumable (one-time) |

---

**RevenueCat Dashboard:** https://app.revenuecat.com/  
**App Store Connect:** https://appstoreconnect.apple.com/  
**Apple Developer Team ID:** `Z96AAJY9NG`  
**Bundle ID:** `com.christianappempire.statflow`
