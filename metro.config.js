const path = require('path');

const projectRoot = path.resolve(__dirname, 'artifacts/mobile');
const workspaceRoot = __dirname;

// expo/metro-config lives in artifacts/mobile/node_modules, not the workspace
// root — resolve it explicitly from there to avoid "Cannot find module" errors.
const { getDefaultConfig } = require(
  require.resolve('expo/metro-config', { paths: [projectRoot] })
);

const config = getDefaultConfig(projectRoot);

// Let Metro see all hoisted packages at the workspace root.
config.watchFolders = [workspaceRoot];

// Prefer the mobile package's own node_modules, then fall back to the
// workspace-root hoisted node_modules (set up by shamefully-hoist=true).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Tell Metro to use symlinked paths instead of following symlinks into the
// real .pnpm/ directory, which breaks relative imports like "../../App".
config.resolver.unstable_enableSymlinks = true;

// Resolve the "@/" path alias that tsconfig.json maps to the project root.
// babel-preset-expo's auto-tsconfig-paths feature doesn't fire reliably when
// Metro is started from outside the mobile package directory, so we wire it
// up here in the resolver instead.
config.resolver.alias = {
  '@': projectRoot,
};

module.exports = config;
