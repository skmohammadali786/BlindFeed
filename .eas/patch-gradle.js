#!/usr/bin/env node
/**
 * Patches generated android/ files AFTER expo prebuild runs.
 *
 * --- Problem 1: expo autolinking uses wrong project root ---
 * expo-modules-autolinking's settings plugin resolves modules by running:
 *   node --eval "require('expo/bin/autolinking')" expo-modules-autolinking resolve ...
 * with workingDir = settings.rootDir (the android/ directory).
 *
 * After expo prebuild runs in artifacts/mobile/ and we move android/ to the
 * monorepo root, settings.rootDir becomes the monorepo root. The autolinking
 * script then reads the monorepo root's package.json, which lists no expo
 * modules as direct dependencies. Zero modules are included as Gradle
 * subprojects → all `import expo.*` in MainActivity.kt are "Unresolved".
 *
 * Fix: Patch android/settings.gradle to add
 *   projectRoot = new File(settings.rootDir.parent, "artifacts/mobile")
 * inside the `expo { }` block before `useExpoModules()`.
 *
 * --- Problem 2: splash screen resource attributes not found ---
 * expo-splash-screen generates Theme.SplashScreen referencing attrs from
 * androidx.core:core-splashscreen. Explicitly add it as a direct dependency.
 */

const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');

// ── Helper ──────────────────────────────────────────────────────────────────
function patch(filePath, transform) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const patched = transform(original);
  if (patched !== original) {
    fs.writeFileSync(filePath, patched, 'utf8');
    console.log(`patch-gradle: patched ${path.basename(filePath)}`);
  } else {
    console.log(`patch-gradle: no changes needed in ${path.basename(filePath)}`);
  }
  return true;
}

// ── 1. Fix autolinking project root in settings.gradle ───────────────────────
const settingsGradle = path.join(androidDir, 'settings.gradle');
const settingsGradleKts = path.join(androidDir, 'settings.gradle.kts');

// Print first 80 lines so we can see the format in build logs
const settingsFile = fs.existsSync(settingsGradle) ? settingsGradle
  : fs.existsSync(settingsGradleKts) ? settingsGradleKts
  : null;

if (!settingsFile) {
  console.log('patch-gradle: WARNING – no settings.gradle found in android/');
} else {
  const content = fs.readFileSync(settingsFile, 'utf8');
  console.log(`\n--- BEGIN ${path.basename(settingsFile)} (first 80 lines) ---`);
  content.split('\n').slice(0, 80).forEach((l, i) => console.log(`${String(i + 1).padStart(3)}: ${l}`));
  console.log(`--- END ${path.basename(settingsFile)} ---\n`);
}

// Now patch the settings file
const PROJECT_ROOT_LINE =
  '  projectRoot = new File(settings.rootDir.parent, "artifacts/mobile")';
const PROJECT_ROOT_LINE_KTS =
  '  projectRoot = File(settings.rootDir.parent, "artifacts/mobile")';

function patchSettings(content, isKts) {
  if (content.includes('projectRoot')) {
    console.log('patch-gradle: settings already has projectRoot, skipping');
    return content;
  }

  const rootLine = isKts ? PROJECT_ROOT_LINE_KTS : PROJECT_ROOT_LINE;

  // Pattern A: expo { ... useExpoModules() ... }
  let patched = content.replace(
    /(expo\s*\{[^}]*?)(useExpoModules\(\))/s,
    (_, prefix, call) => `${prefix}${rootLine}\n  ${call}`
  );
  if (patched !== content) {
    console.log('patch-gradle: applied Pattern A (expo { useExpoModules() })');
    return patched;
  }

  // Pattern B: standalone useExpoModules() call
  patched = content.replace(
    /^(\s*useExpoModules\(\))/m,
    `expo {\n${rootLine}\n  useExpoModules()\n}`
  );
  if (patched !== content) {
    console.log('patch-gradle: applied Pattern B (bare useExpoModules())');
    return patched;
  }

  console.log('patch-gradle: WARNING – could not find useExpoModules() in settings, no patch applied');
  return content;
}

if (settingsFile) {
  const isKts = settingsFile.endsWith('.kts');
  patch(settingsFile, (c) => patchSettings(c, isKts));
}

// ── 2. Add core-splashscreen dependency to android/app/build.gradle ──────────
const appBuildGradle = path.join(androidDir, 'app', 'build.gradle');
patch(appBuildGradle, (content) => {
  if (content.includes('core-splashscreen')) {
    return content;
  }
  const updated = content.replace(
    /^(dependencies \{)/m,
    '$1\n    // Added by .eas/patch-gradle.js\n    implementation("androidx.core:core-splashscreen:1.0.1")'
  );
  if (updated !== content) {
    console.log('patch-gradle: added androidx.core:core-splashscreen:1.0.1');
  }
  return updated;
});
