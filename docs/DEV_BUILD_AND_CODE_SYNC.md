# Development Build: Which Code Runs on Your Device

## Clean slate (current state)

- **Commit:** `876893f` — "google signin debug done"
- **Working tree:** clean (no uncommitted changes)

To discard any **future** uncommitted changes and stay at this commit:

```bash
# Discard changes in specific files
git restore <file>

# Discard ALL uncommitted changes (working tree + staged)
git reset --hard HEAD
```

Only run `git reset --hard` when you are sure you want to lose all local edits.

---

## How the device gets its code

| What | Where it comes from |
|------|---------------------|
| **App version (e.g. 1.0.2)** | The **development build** you installed (APK/IPA). Set in `app.json` → `expo.version`. This is the native “shell” and version number. |
| **Actual app behavior (screens, save, share, etc.)** | The **JavaScript bundle** served by your laptop when you run `npm start`. The device loads this over `exp://192.168.x.x:8081`. |

So: **1.0.2** is just the native app version. The code that runs (including save QR / save Photo) is whatever your dev server is serving **at the moment you load or reload** the app.

---

## Making sure the device runs your changed code

1. **Save** your code changes in the editor.
2. **Keep** `npm start` running on the laptop.
3. **On the device:** reload the app (e.g. shake → “Reload”, or use the dev menu).
4. The app will fetch the **latest JS** from the dev server; that is the “changed version” applied in the development build.

No new EAS build or reinstall is needed for JS-only changes. You only need a new build if you change native config (e.g. new native modules or `app.json` native fields).

---

## Quick checklist

- [ ] Laptop: `npm start` running from project root.
- [ ] Device: same Wi‑Fi; app opened is the **development build** (not Expo Go).
- [ ] Device: connected via manual URL `exp://192.168.x.x:8081` (or QR with tunnel).
- [ ] After editing code: save file → reload app on device.

After this clean slate, we can work on fixing **Save QR code** and **Save Photo** in the repo.
