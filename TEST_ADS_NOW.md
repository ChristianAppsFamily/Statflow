# 🧪 Test Ads Configuration - ACTIVE

**Date:** 2026-04-05 23:01 PDT  
**Status:** ✅ Test ads enabled for Release builds

---

## 🎯 What Changed

**File:** `constants/ads.ts`

**Changes:**
1. Updated iOS banner test ID to Demo Adaptive Banner: `ca-app-pub-3940256099942544/2435281174`
2. **Forced `USE_TEST_ADS = true`** - Test ads will show in BOTH Debug and Release builds
3. Added clear comment explaining this is temporary for testing

**Why:**
- Verify ads are programmed correctly
- Test ads show immediately (no 24-48h wait)
- Safe to test in Release mode on real device
- Proves ad implementation works

---

## 📱 How to Test Ads Now

### Step 1: Build in Xcode
```bash
cd /Users/longmoressd/Desktop/ChristianAppEmpire/rork-statflow-main/expo
open ios/StatFlow.xcworkspace
```

### Step 2: Select Release Mode
1. Product → Scheme → Edit Scheme
2. Run → Build Configuration → **Release**
3. Click Close

### Step 3: Run on iPhone
1. Connect your iPhone
2. Select device in Xcode
3. Click ▶️ (or ⌘R) to build and run

### Step 4: Grant ATT Permission
- When prompted, tap **Allow** for tracking
- This enables ads to load

### Step 5: Test Banner Ads
Check bottom of each tab:
- ✅ Home tab
- ✅ Add Stats tab
- ✅ History tab
- ✅ Players tab
- ✅ Settings tab

**Expected:** Google test banner ads should show at bottom of each screen

### Step 6: Test Interstitial Ads
1. Start a new game
2. Add some stats
3. Save the game
4. **Expected:** Full-screen interstitial ad should appear (30s cooldown)

### Step 7: Check Logs
Open Xcode console and look for:
```
[Ads] Requesting tracking permission...
[Ads] Tracking permission granted: true
[Ads] AdMob SDK imported successfully
[Ads] AdMob SDK initialized successfully
[Ads] Ads initialization complete
[BannerAd] Ad loaded successfully
[Ads] Interstitial ad loaded
```

---

## ✅ Expected Results

### Banner Ads:
- **Should show:** Google's demo banner ads
- **Location:** Bottom of each tab screen
- **Style:** Adaptive banner (fits screen width)
- **Content:** Test ad creative (placeholder)

### Interstitial Ads:
- **Should show:** After saving a game session
- **Cooldown:** 30 seconds between shows
- **Style:** Full-screen ad
- **Content:** Test ad creative (placeholder)

### What Test Ads Look Like:
- Usually show "Test Ad" or placeholder text
- May show sample product ads
- Will NOT show your production ads
- Fill rate: 100% (test ads always available)

---

## 🔄 After Testing - Switch Back to Production

Once you've confirmed ads work correctly, switch back to production IDs:

### Edit `constants/ads.ts`:
```typescript
// Change this line:
export const USE_TEST_ADS = true;

// Back to:
export const USE_TEST_ADS = __DEV__;
```

This will:
- Use test ads in Debug mode
- Use production ads in Release mode
- Production ads will start showing after 24-48h

---

## 🐛 Troubleshooting

### "No ads showing"
✅ **Check:**
- ATT permission granted?
- Testing in Release mode?
- Using real device (not simulator)?
- Check Xcode console for errors

### "Ads load but crash"
❌ **Problem:** Code issue
✅ **Check:** Console logs for error messages

### "Banner shows but interstitial doesn't"
✅ **Normal:** First interstitial may take a moment to load
✅ **Wait:** 10-15 seconds after opening app
✅ **Or:** Cooldown active (30s between shows)

### "ATT permission not showing"
✅ **Check:** Info.plist has NSUserTrackingUsageDescription
✅ **Try:** Delete app and reinstall

---

## 📊 Current Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| **USE_TEST_ADS** | `true` | Force test ads always |
| **iOS Banner ID** | `...2435281174` | Demo Adaptive Banner |
| **iOS Interstitial ID** | `...4411468910` | Demo Interstitial |
| **Production IDs** | Configured | Ready when you switch back |

---

## 🎯 Success Criteria

✅ **Ads working if you see:**
- Banner ads at bottom of tabs
- Interstitial ad after saving game
- Console logs show "Ad loaded successfully"
- No crashes or errors

✅ **Implementation correct if:**
- ATT prompt appears on first launch
- Banner ads appear on all 5 tabs
- Interstitial appears after save (with cooldown)
- Ads respect ad-free subscription (when purchased)
- App works fine if ads don't load

---

## 🚀 What This Proves

**If test ads show:**
✅ AdMob SDK integrated correctly  
✅ Ad placement implemented correctly  
✅ ATT flow working  
✅ Banner ads configured properly  
✅ Interstitial ads configured properly  
✅ Error handling working  

**Then production ads will work once:**
- You switch back to production IDs (`USE_TEST_ADS = __DEV__`)
- Production ad units mature (24-48 hours)
- You build and deploy with production config

---

## 📝 Next Steps

1. **Test now** with these settings
2. **Verify** ads show correctly
3. **Report back** if working or any issues
4. **Switch back** to production IDs when confirmed
5. **Wait 24-48h** for production ads to start serving

---

**Current Status:** Test ads ENABLED for immediate testing  
**Last Updated:** 2026-04-05 23:01 PDT  
**Ready to test!** 🚀
