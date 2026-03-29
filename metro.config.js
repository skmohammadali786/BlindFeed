const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * EAS builds run Gradle from the monorepo root (android/ was moved here
 * by the expo pnpm script). Metro therefore starts here, but the actual
 * Expo project — source files, package.json with "main":"expo-router/entry",
 * and node_modules — all live in artifacts/mobile/.
 *
 * Setting projectRoot to artifacts/mobile tells Metro:
 *   • where to find source files (app/, components/, …)
 *   • which package.json to read for the entry point
 *   • which node_modules to use first
 *
 * watchFolders + nodeModulesPaths add the workspace-root node_modules so
 * hoisted pnpm packages (react-native, expo, …) are also resolvable.
 *
 * unstable_enableSymlinks stops Metro from following pnpm symlinks to the
 * real .pnpm/ path, which is what caused the "../../App" resolution failure.
 */

const projectRoot = path.resolve(__dirname, 'artifacts/mobile');
const workspaceRoot = __dirname;

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.unstable_enableSymlinks = true;

module.exports = config;
