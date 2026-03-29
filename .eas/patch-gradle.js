#!/usr/bin/env node
/**
 * Patches android/build.gradle (at the monorepo root, after expo prebuild has
 * moved it there) to lower compileSdk/targetSdk from 36 → 34.
 *
 * Why: expo-modules-core defaults to compileSdk 36 (Android 16). The version
 * of androidx.core:core-splashscreen bundled with expo-splash-screen declares
 * custom attributes (windowSplashScreenBackground, etc.) that aapt2 cannot
 * link against the platform's own copy of those attributes when compileSdk ≥ 35.
 * compileSdk 34 (Android 14) predates the conflict and is fully supported by
 * all packages in this project.
 */

const fs = require('fs');
const path = require('path');

const rootBuildGradle = path.join(__dirname, '..', 'android', 'build.gradle');
const appBuildGradle  = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

function patch(file, description) {
  if (!fs.existsSync(file)) {
    console.log(`patch-gradle: ${file} not found, skipping`);
    return;
  }
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content
    .replace(/compileSdkVersion\s*=\s*\d+/g,   'compileSdkVersion = 34')
    .replace(/compileSdk\s*=\s*\d+/g,           'compileSdk = 34')
    .replace(/targetSdkVersion\s*=\s*\d+/g,     'targetSdkVersion = 34')
    .replace(/targetSdk\s*=\s*\d+/g,            'targetSdk = 34')
    .replace(/buildToolsVersion\s*=\s*"[\d.]+"/g,'buildToolsVersion = "34.0.0"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`patch-gradle: patched ${description} → compileSdk/targetSdk 34`);
  } else {
    console.log(`patch-gradle: no changes needed in ${description}`);
  }
}

patch(rootBuildGradle, 'android/build.gradle');
patch(appBuildGradle,  'android/app/build.gradle');
