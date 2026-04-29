# AdMob Setup Guide for StatFlow

## Current Status

✅ AdMob SDK installed and configured  
🚧 Placeholder ad unit IDs need to be replaced with real IDs  

---

## What Needs to Be Done

You need to create ad units in the AdMob console and update the app configuration with the real IDs.

### 1. Create AdMob Account & App

1. Go to https://admob.google.com/
2. Sign in with your Google account
3. Click **Apps** → **Add App**
4. Select **iOS**
5. App name: **StatFlow**
6. App Store URL: (leave blank for now, add after App Store submission)
7. Click **Add App**

You'll receive an **AdMob App ID** that looks like: `ca-app-pub-3002325591150738~1234567890`

### 2. Create Ad Units

In the AdMob console:

#### Banner Ad Unit
1. Click **Ad Units** → **Add Ad Unit**
2. Select **Banner**
3. Name: `StatFlow Banner`
4. Ad type: **Banner** (320x50)
5. Click **Create Ad Unit**
6. Copy the **Ad Unit ID** (e.g., `ca-app-pub-3002325591150738/1111111111`)

#### Interstitial Ad Unit
1. Click **Ad Units** → **Add Ad Unit**
2. Select **Interstitial**
3. Name: `StatFlow Interstitial`
4. Click **Create Ad Unit**
5. Copy the **Ad Unit ID** (e.g., `ca-app-pub-3002325591150738/2222222222`)

#### Rewarded Ad Unit (optional for future)
1. Click **Ad Units** → **Add Ad Unit**
2. Select **Rewarded**
3. Name: `StatFlow Rewarded`
4. Click **Create Ad Unit**
5. Copy the **Ad Unit ID** (e.g., `ca-app-pub-3002325591150738/3333333333`)

---

## 3. Update App Configuration

### Update `app.json`

Replace the placeholder AdMob app ID:

```json
"ios": {
  "infoPlist": {
    "GADApplicationIdentifier": "ca-app-pub-3002325591150738~YOUR_REAL_APP_ID_HERE"
  }
}
```

Also update the plugin configuration:

```json
"plugins": [
  [
    "react-native-google-mobile-ads",
    {
      "androidAppId": "ca-app-pub-3002325591150738~ANDROID_APP_ID",
      "iosAppId": "ca-app-pub-3002325591150738~YOUR_REAL_IOS_APP_ID"
    }
  ]
]
```

### Update `constants/ads.ts`

Replace the placeholder ad unit IDs:

```typescript
export const ADMOB_APP_ID = Platform.select({
  ios: 'ca-app-pub-3002325591150738~YOUR_REAL_IOS_APP_ID',
  android: 'ca-app-pub-3002325591150738~ANDROID_APP_ID',
  default: '',
});

export const AD_UNIT_IDS = Platform.select({
  ios: {
    banner: 'ca-app-pub-3002325591150738/YOUR_REAL_BANNER_ID',
    interstitial: 'ca-app-pub-3002325591150738/YOUR_REAL_INTERSTITIAL_ID',
    rewarded: 'ca-app-pub-3002325591150738/YOUR_REAL_REWARDED_ID',
  },
  // ... android config
});
```

---

## 4. Rebuild Native Project

After updating the IDs:

```bash
cd /Users/longmoressd/Desktop/ChristianAppEmpire/rork-statflow-main/expo
npx expo prebuild --platform ios --clean
cd ios && pod install
```

Then open in Xcode and rebuild.

---

## 5. Ad Content Filtering (Important!)

Since StatFlow is a Christian/family-friendly app, you need to block inappropriate ad categories:

### In AdMob Console:
1. Go to **Blocking Controls** → **Content**
2. Block these categories:
   - Dating
   - Gambling & Betting
   - Social Casino Games
   - Alcohol
   - Healthcare & Medicines (if desired)
   - Get Rich Quick
   - Occult & Paranormal
   - Politics
   - Religion (if desired — may conflict with app theme)
   - Cosmetic Procedures & Body Modification
   - Debated Sensitive Social Issues
   - Shocking Content
   - Weapons

3. Set **Sensitive Categories** to **Exclude**
4. Set **Ad Review Center** to review ads manually (optional)

### Set Max Content Rating:
1. Go to **App Settings**
2. Set **Max Ad Content Rating** to **G** (General Audiences)

---

## 6. Testing Ads

### Test Ads (Already Configured)
The app is configured to use Google's official test ad unit IDs in development mode:

- Banner: `ca-app-pub-3940256099942544/2934735716`
- Interstitial: `ca-app-pub-3940256099942544/4411468910`
- Rewarded: `ca-app-pub-3940256099942544/1712485313`

These will show test ads in debug builds (`__DEV__ === true`).

### Production Ads
In **Release** build mode, the app will use your real ad unit IDs.

⚠️ **Important:** Always test with real ad unit IDs in Release mode before submitting to App Store.

---

## 7. AdMob Approval Process

After configuring ad units:

1. **Wait for AdMob review** (can take 24-48 hours)
2. AdMob will review your ad units and approve them
3. Until approved, ads may not show or will show limited inventory
4. Check AdMob console for approval status

---

## 8. App Store Submission

When submitting to App Store:

1. Add App Store URL to AdMob app settings
2. Make sure **Sensitive Categories** are properly blocked
3. Include privacy policy URL in App Store listing
4. Mention ad support in app description (optional)

---

## Troubleshooting

### Ads Not Showing
- Check AdMob console for approval status
- Verify ad unit IDs are correct
- Make sure you're testing in **Release** mode (not Debug)
- ATT permission must be granted
- Check Xcode console for `[Ads]` logs

### Ad Inventory Low
- Normal for new ad units (takes time to build inventory)
- Test ads always fill; production ads may not
- Higher traffic = better fill rates

### AdMob Account Suspended
- Make sure app doesn't violate AdMob policies
- Don't click your own ads during testing
- Use test ad unit IDs for development

---

## Quick Reference

| Item | Placeholder | Your Value |
|------|-------------|------------|
| iOS App ID | `ca-app-pub-3002325591150738~1234567890` | (get from AdMob) |
| Banner ID | `ca-app-pub-3002325591150738/1111111111` | (get from AdMob) |
| Interstitial ID | `ca-app-pub-3002325591150738/2222222222` | (get from AdMob) |
| Rewarded ID | `ca-app-pub-3002325591150738/3333333333` | (get from AdMob) |

---

**AdMob Console:** https://admob.google.com/  
**Publisher ID:** `ca-app-pub-3002325591150738`  
**Apple Developer Team ID:** `Z96AAJY9NG`
