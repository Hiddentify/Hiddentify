# Hiddentify Android / Play Store deployment

Hiddentify is packaged as a Trusted Web Activity (TWA). The Android application is a small,
full-screen shell around the production PWA at `https://hiddentify.space`. The web game remains
the single source of truth, so normal game updates can ship through Vercel without rebuilding the
Android app unless the Android configuration, icon, permissions, package, or version changes.

## Fixed application identity

- Package ID: `space.hiddentify.app`
- App name: `Hiddentify`
- Production host: `hiddentify.space`
- Minimum Android version: API 23 (Android 6)
- Target/compile API: 36
- First version: `1.0.0` (`versionCode` 1)

The package ID is permanent after the first Play Store upload. Do not change it after publishing.

## Before creating the Android release

1. Deploy and test the guest-only branch on the beta URL.
2. Set `NEXT_PUBLIC_ACCOUNTS_ENABLED=false` in the beta Vercel project and redeploy.
3. After the beta multiplayer tests pass, merge the tested commit into `main` and deploy it to
   `hiddentify.space`.
4. Confirm these production URLs return successfully:
   - `https://hiddentify.space/`
   - `https://hiddentify.space/manifest.webmanifest`
   - `https://hiddentify.space/sw.js`
   - `https://hiddentify.space/hiddentify-icon-512.png`

## Build the Android App Bundle

Install Node.js 22+, JDK 17, and Android SDK command-line tools. Then, from the project root:

```bash
npm install --global @bubblewrap/cli
cd android
bubblewrap update --skipVersionUpgrade
bubblewrap build
```

Bubblewrap asks for the upload keystore password locally. Never commit the keystore or its password.
The repository ignores `*.keystore` and `*.jks` files. Back up the upload keystore and password in a
password manager. The Play Store upload file is the signed `.aab` generated under `android/`.

For a device-only check before Play Console submission, install the generated signed APK with:

```bash
bubblewrap install
```

### Build the signed bundle with GitHub Actions

The repository also includes the manual workflow **Build signed Android App Bundle**. Add these
four repository secrets under **GitHub > Settings > Secrets and variables > Actions**:

- `ANDROID_KEYSTORE_BASE64` — the upload keystore encoded as base64
- `ANDROID_KEYSTORE_PASSWORD` — the upload keystore password
- `ANDROID_KEY_ALIAS` — the alias inside the upload keystore
- `ANDROID_KEY_PASSWORD` — the upload key password

Then open **GitHub > Actions > Build signed Android App Bundle > Run workflow** on the tested
release branch. When the job finishes, download the `hiddentify-play-store-aab` artifact and upload
its `.aab` file to Play Console internal testing. GitHub keeps the generated artifact for 14 days.
The workflow never commits the keystore or passwords.

## Connect the app and website

1. Create the app in Google Play Console with package ID `space.hiddentify.app`.
2. Enable Play App Signing.
3. Open **Release > Setup > App integrity** and copy the SHA-256 fingerprint under
   **App signing key certificate** (not only the upload certificate).
4. In Vercel, open the production `hiddentify` project, then
   **Settings > Environment Variables > Add New**.
5. Add `ANDROID_APP_SHA256_FINGERPRINT` for Production. Paste only the SHA-256 fingerprint.
   If both Play and a local test certificate must be trusted, separate fingerprints with a comma.
6. Redeploy production and verify:
   `https://hiddentify.space/.well-known/assetlinks.json`.

The endpoint intentionally returns 404 until a valid SHA-256 fingerprint is configured. After it
is configured, Android verifies ownership of the website and opens Hiddentify without browser UI.

## Play Console release order

1. Complete the store listing, privacy policy, content rating, data safety form, and app access form.
2. Upload the signed `.aab` to **Internal testing** first.
3. Install from the Play testing link on at least two physical phones.
4. Test guest room creation/join, background/foreground recovery, room links, both languages,
   Casual and Detective modes, multiple killers, evidence, voting, and reconnect.
5. Promote the same tested bundle to Closed/Open testing or Production only after those tests pass.

For each Android update, increment `appVersionCode` in `android/twa-manifest.json`, update
`appVersion`, run `bubblewrap update --skipVersionUpgrade`, and build a new signed AAB.

## Restoring accounts later

Account code remains in the application but is hidden for launch. After email delivery and callback
URLs are fully tested, set `NEXT_PUBLIC_ACCOUNTS_ENABLED=true` and redeploy. Guest play remains
available; the Android package does not need to change because it loads the same production PWA.
