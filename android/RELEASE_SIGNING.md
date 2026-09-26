# Persistent Android release signing

The release workflow publishes `Hiddentify-1.1.3.apk` and `Hiddentify.apk` only after all four repository Actions secrets are configured:

- `ANDROID_KEYSTORE_BASE64`: base64 encoding of the binary release keystore, kept as a GitHub secret.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: release key alias.
- `ANDROID_KEY_PASSWORD`: key password.

Generate a dedicated release key once and keep an offline backup of the keystore and credentials. Never commit them or print them in workflow logs. The workflow decodes the key into the runner's temporary directory, builds `assembleRelease`, installs that APK in the emulator, verifies its package/version and signing certificate, and only then replaces the public `android-direct` release. Without the secrets it still smoke-tests a debug build and uploads a clearly named debug artifact, leaving the public release untouched.

The previously distributed 1.1.3 APK used an ephemeral debug certificate. Android cannot update that installation with the new release key: users must uninstall the debug-signed build once, then install the release-signed build. Future releases signed with the same backed-up key can install as normal updates, subject to increasing `versionCode`.
