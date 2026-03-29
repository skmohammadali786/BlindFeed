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

// Resolve the "@/" path alias (tsconfig.json: "@/*" -> "./*" from projectRoot).
// resolver.alias only matches exact module names, not prefixes, so we use a
// custom resolveRequest that converts "@/foo" to an absolute path and then
// hands off to Metro's default resolution (which handles extensions, index
// files, platform suffixes, etc.).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const absolutePath = path.resolve(projectRoot, moduleName.slice(2));
    return context.resolveRequest(context, absolutePath, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
