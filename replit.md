# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/mobile` (`@workspace/mobile`)

**BlindFeed** — anonymous social media Expo mobile app (React Native + Expo Router). Fully connected to real PostgreSQL backend.

**Architecture:**
- Dev server: `server/dev-proxy.js` runs on `$PORT`, proxies `/api-server/*` → API server (port 8080), everything else → Metro (port 19001). This avoids CORS issues since both app and API share the same `expo.kirk.replit.dev` origin.
- API base URL: `https://${EXPO_PUBLIC_DOMAIN}/api-server/api` where `EXPO_PUBLIC_DOMAIN=$REPLIT_EXPO_DEV_DOMAIN`
- Anonymous ID: stored in AsyncStorage as `bf_anonymous_id`, sent as `x-anonymous-id` header

**Theme system**: `context/ThemeContext.tsx` — `useTheme()` + `makeStyles(colors)` pattern. All screens use this.
- Dark: bg=`#1C1C1E`, surface=`#2C2C2E`, green=`#3DDB85`
- Light: bg=`#F2F2F7`, surface=`#FFFFFF`, green=`#25A265`

**Screens** (all use theme system):
- `app/index.tsx` — Entry redirect based on registration/onboarding state
- `app/onboarding/privacy.tsx` — Quick Setup screen
- `app/onboarding/register.tsx` — Registration (name/email/phone for moderation only)
- `app/feed.tsx` — Main feed with Fresh/Top toggle, pull-to-refresh, real API posts
- `app/create.tsx` — New post (text + image via expo-image-picker, presigned upload, drafts)
- `app/post/[id].tsx` — Post detail with comments/replies, Worth it/Skip reactions
- `app/search.tsx` — Search with suggestion chips and recent searches
- `app/settings.tsx` — Full settings with theme toggle, all actions wired up
- `app/identity.tsx` — Temp user ID card with Copy ID (7-day rotation)
- `app/usage-insights.tsx` — Activity stats derived from posts/reactions
- `app/report.tsx` — Report content with 4 reasons + success state
- `app/notifications.tsx` — Daily reminder + post performance toggles
- `app/community-guidelines.tsx` — Shield icon + 4 rules + "I understand"
- `app/terms.tsx` — Terms of Service + Privacy Policy + "I Understand"

**Animation system**: `components/Animations.tsx` — comprehensive Reanimated 3 animation library used on every screen:
- `ScreenTransition` — wraps screen root with `FadeIn.duration(320)` entering animation
- `FadeSlide` — fades in + slides up/down with configurable `delay` and spring physics
- `AnimatedListItem` — staggered `FadeInDown` for list items (delay = `index * 65ms`, capped at 500ms)
- `AnimatedPressable` — spring-scale press feedback (scale to `scaleTo` prop, default 0.94)
- `BounceFab` — FAB entrance with `ZoomIn.springify().damping(11)`
- `PulseView` — continuous scale pulsing via `withRepeat`
- `GlowPulse` — continuous opacity pulsing
- `useReactionAnim` — triple-spring bounce for Worth it / Skip reaction buttons
- `useShimmer` — opacity shimmer for skeleton/loading states

**API client**: `utils/api.ts` — auto-detects environment:
- Dev (NODE_ENV=development): `window.location.origin + /api-server/api` → dev proxy strips `/api-server` and forwards to port 8080
- Production (NODE_ENV=production): `window.location.origin + /api` → Replit's router sends `/api/*` directly to the API server (artifact `previewPath = "/api"`)
- Native fallback: `https://${EXPO_PUBLIC_DOMAIN}/api-server/api` or `localhost:8080/api`

**Context**: `context/AppContext.tsx` — exposes `appInitialized`, `registered`, `onboarded`, posts, settings, tempUserId, session timer

**Key packages**: `expo-router`, `expo-haptics`, `expo-image`, `expo-image-picker`, `expo-clipboard`, `@react-native-async-storage/async-storage`, `react-native-safe-area-context`, `react-native-reanimated`

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
