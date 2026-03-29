#!/usr/bin/env node
/**
 * Patches the generated android/ files AFTER expo prebuild runs.
 *
 * Two problems to fix:
 *
 * 1. ExpoRootProject Gradle plugin hardcodes compileSdk = 36 and overwrites
 *    the ext block in android/build.gradle during the configuration phase.
 *    We patch android/app/build.gradle to use literal values (34) instead of
 *    rootProject.ext.compileSdkVersion so the plugin cannot override them.
 *
 * 2. The splash screen styles (Theme.SplashScreen) reference attributes
 *    (windowSplashScreenBackground, windowSplashScreenAnimatedIcon,
 *    postSplashScreenTheme) that come from androidx.core:core-splashscreen.
 *    With SDK 36 those attrs conflict with the platform's own copies, and with
 *    certain expo-splash-screen versions the library isn't declared as a direct
 *    Gradle dep. We add it explicitly so aapt2 can resolve them.
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

// ── 1. Lower compileSdk/targetSdk in android/app/build.gradle ──────────────
// Replace rootProject.ext references with literal values so the ExpoRootProject
// plugin cannot override them after our patch runs.
content = content
  .replace(
    /compileSdkVersion\s+rootProject\.ext\.compileSdkVersion/g,
    'compileSdkVersion 34'
  )
  .replace(
    /compileSdkVersion\s*=\s*rootProject\.ext\.compileSdkVersion/g,
    'compileSdkVersion = 34'
  )
  .replace(
    /compileSdk\s+rootProject\.ext\.compileSdkVersion/g,
    'compileSdk 34'
  )
  .replace(
    /compileSdk\s*=\s*rootProject\.ext\.compileSdkVersion/g,
    'compileSdk = 34'
  )
  .replace(
    /targetSdkVersion\s+rootProject\.ext\.targetSdkVersion/g,
    'targetSdkVersion 34'
  )
  .replace(
    /targetSdkVersion\s*=\s*rootProject\.ext\.targetSdkVersion/g,
    'targetSdkVersion = 34'
  )
  .replace(
    /targetSdk\s+rootProject\.ext\.targetSdkVersion/g,
    'targetSdk 34'
  )
  .replace(
    /targetSdk\s*=\s*rootProject\.ext\.targetSdkVersion/g,
    'targetSdk = 34'
  )
  .replace(
    /buildToolsVersion\s+rootProject\.ext\.buildToolsVersion/g,
    'buildToolsVersion "34.0.0"'
  )
  .replace(
    /buildToolsVersion\s*=\s*rootProject\.ext\.buildToolsVersion/g,
    'buildToolsVersion = "34.0.0"'
  );

// Also catch any remaining direct numeric references > 34
content = content
  .replace(/compileSdkVersion\s+3[5-9]/g, 'compileSdkVersion 34')
  .replace(/compileSdk\s+3[5-9]/g, 'compileSdk 34')
  .replace(/targetSdkVersion\s+3[5-9]/g, 'targetSdkVersion 34')
  .replace(/targetSdk\s+3[5-9]/g, 'targetSdk 34')
  .replace(/buildToolsVersion\s+"3[5-9][^"]*"/g, 'buildToolsVersion "34.0.0"');

// ── 2. Add core-splashscreen as an explicit dependency ──────────────────────
if (!content.includes('core-splashscreen')) {
  // Insert after the opening 'dependencies {' line
  content = content.replace(
    /^(dependencies \{)/m,
    '$1\n    // Added by .eas/patch-gradle.js – required for splash screen attrs\n    implementation("androidx.core:core-splashscreen:1.0.1")'
  );
  console.log('patch-gradle: added androidx.core:core-splashscreen:1.0.1');
}

if (content !== original) {
  fs.writeFileSync(appBuildGradle, content, 'utf8');
  console.log('patch-gradle: android/app/build.gradle patched successfully');
} else {
  console.log('patch-gradle: no changes needed in android/app/build.gradle');
}
