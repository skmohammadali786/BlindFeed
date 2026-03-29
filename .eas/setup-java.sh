#!/usr/bin/env bash
# Dynamically locate Java 17 on the EAS build server and write it to
# android/gradle.properties so Gradle uses the correct JDK regardless
# of which Linux distribution / JDK vendor is installed on the image.
set -euo pipefail

echo "EAS setup-java: searching for Java 17..."

# Strategy 1: scan every JVM 'release' file for JAVA_VERSION="17*"
J17=$(find /usr/lib/jvm /usr/local/lib/jvm -maxdepth 3 -name "release" 2>/dev/null | while read -r f; do
  if grep -q 'JAVA_VERSION="17' "$f" 2>/dev/null; then
    dirname "$f"
    break
  fi
done || true)

# Strategy 2: fall back to update-alternatives
if [ -z "${J17:-}" ]; then
  J17=$(update-alternatives --list java 2>/dev/null | grep -E "java-17|jdk-17|jdk17" | head -1 | sed 's|/bin/java||' || true)
fi

if [ -n "${J17:-}" ] && [ -f android/gradle.properties ]; then
  echo "EAS setup-java: found Java 17 at $J17"
  echo "org.gradle.java.home=$J17" >> android/gradle.properties
  echo "EAS setup-java: wrote org.gradle.java.home to android/gradle.properties"
else
  echo "EAS setup-java: WARNING — could not locate Java 17; Gradle will use the system default"
fi
