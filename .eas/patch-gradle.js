#!/usr/bin/env node
/**
 * Patches android/app/build.gradle AFTER expo prebuild runs.
 *
 * Problem: expo-splash-screen generates a Theme.SplashScreen style that
 * references attr/windowSplashScreenBackground, attr/windowSplashScreenAnimatedIcon,
 * and attr/postSplashScreenTheme. These attrs come from
 * androidx.core:core-splashscreen. With compileSdk 36 (Android 16) aapt2 can
 * see those same attrs in the platform android.jar and refuses to link the
 * library-defined copies, causing:
 *
 *   error: style attribute 'attr/windowSplashScreenBackground ... not found.
 *
 * Fix: explicitly add core-splashscreen:1.0.1 as a direct Gradle dependency
 * so the AAR's attr declarations are authoritative and aapt2 can resolve them.
 *
 * NOTE: We do NOT touch compileSdkVersion / targetSdkVersion. Lowering to 34
 * fixes the resource conflict but breaks expo-modules-core Kotlin compilation
 * because that library references Android 15/16 APIs from the SDK 35/36 jar.
 */

const fs = require('fs');
const path = require('path');

const appBuildGradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(appBuildGradle)) {
  console.log('patch-gradle: android/app/build.gradle not found – skipping');
  process.exit(0);
}

let content = fs.readFileSync(appBuildGradle, 'utf8');
const original = content;

// Add core-splashscreen as an explicit dependency so aapt2 can find the
// splash screen attributes regardless of transitive dependency resolution.
if (!content.includes('core-splashscreen')) {
  content = content.replace(
    /^(dependencies \{)/m,
    '$1\n    // Added by .eas/patch-gradle.js – required for splash screen resource attrs\n    implementation("androidx.core:core-splashscreen:1.0.1")'
  );
  console.log('patch-gradle: added androidx.core:core-splashscreen:1.0.1');
} else {
  console.log('patch-gradle: core-splashscreen already present, skipping');
}

if (content !== original) {
  fs.writeFileSync(appBuildGradle, content, 'utf8');
  console.log('patch-gradle: android/app/build.gradle patched successfully');
} else {
  console.log('patch-gradle: no changes needed');
}
