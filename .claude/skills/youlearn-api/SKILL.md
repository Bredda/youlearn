---
name: youlearn-api
description: Backend conventions for YouLearn - Fastify routes in apps/api, drizzle schema and migrations in packages/db, audit events in packages/events, shared types in packages/types, Better Auth roles and hooks, startup seeds, and how to verify endpoints. Use when creating or changing API routes, database schema or migrations, events, shared response types, or auth rules.
---

# YouLearn backend

## Routes (`apps/api/src/routes`)

- One plugin per area, registered in `routes/index.ts`. Permission hooks: admin routes `app.requireAdmin`, writer-area routes `app.requireWriter`, other authenticated ones `app.requireAuth` (`plugins/auth.ts`). Use `addHook("preHandler", ...)` for a whole plugin.
- Validate every body, query and params with zod (a `ZodError` becomes a 400). Map unique violations to 409 (`isUniqueViolation`), foreign key violations with `isForeignKeyViolation`. Error messages are English.
- Prefer Better Auth endpoints for account operations (create, role, ban, password, delete) and add our own routes only for what it does not know (groups, listings joined with groups).
- A route that acts on a course loads it with `authorizeCourse` (404 / 403 handled for you) - see the `youlearn-courses` skill.
- A POST/DELETE sent with `Content-Type: application/json` needs a body (`{}`); the web client sends none and no header in that case.

## Listing endpoints (pagination, sort, filters)

Same shape for users, events and courses: a zod `query` (`q`, filters, `sort`, `order`, `page`, `pageSize` max 100), a `sortColumns` map (`lower(name)` for text), `count()` for `total`, then the page with `.orderBy(direction(column), asc(id))` (the id tie-break keeps pages stable), `.limit().offset()`. Search with `ilike` and `escapeLike` (`lib/sql.ts`). Return `{ items, total, page, pageSize }` (plus the options of the filters when the UI needs them) typed in `@youlearn/types` together with the `...Query` type shared with the web app. In Postgres, `SELECT DISTINCT` cannot be ordered by an expression absent from the select list: use `GROUP BY` on the key instead.

## Database (`packages/db`)

- Schema in `packages/db/src/schema/*`, columns camelCase in code and snake_case in SQL (`casing: "snake_case"`). After editing the schema run `pnpm db:generate`, read the generated SQL, commit the migration, then `pnpm db:migrate`. **Never edit an applied migration.** Do not reformat `drizzle/` files.
- The `group` table is an SQL reserved word: always go through drizzle for it, never hand-written SQL.
- Import query helpers (`eq`, `and`, `sql`, `exists`, ...) from `@youlearn/db`, which re-exports them; do not add `drizzle-orm` to other packages (pnpm resolves a broken peer copy).
- Concurrency: serialize changes of an aggregate by locking its row inside a transaction (`.for("update")`, see `lib/revisions.ts`); enforce "at most one" invariants with partial unique indexes.
- Soft delete uses a `deletedAt` column and partial unique indexes (`where deleted_at is null`) so the unique value is freed.

## Types (`packages/types`)

Derive from the schema (`typeof schema.x.$inferSelect`) and keep the package free of runtime code (type-only imports). API responses that cross to the web app are typed there; JSON dates are strings. A type that the schema itself needs (a jsonb shape) is defined in the schema file and re-exported; the course content shape lives in `@youlearn/content` (a pure leaf the schema imports) because the web app validates and diffs it too.

## Events (audit log)

Every notable action is recorded in the `event` table with `recordEvent` (`@youlearn/events/server`): actor, `feature.action` type, target, metadata. Types are declared in `packages/events/src/index.ts` (`EVENTS`); adding one also requires its labels in `apps/web/lib/events.ts` (compile-checked, including `describeEvent` when the metadata is worth showing). User mutations are captured in one place, the Better Auth hooks in `packages/auth/src/user-events.ts`; other features call `recordEvent` after their change is committed. It never throws, and never put secrets in `metadata`. Do not log high-frequency actions (content saves): contributors record who worked. System actions have no actor (`asset.deprecate`).

Learner journey routes (`routes/learning.ts`) are `requireAuth` and scoped to the caller (`getCourseActor`); an enrollment that is not the caller's answers 404. Anything a learner receives goes through `LearnerContent` / `LearnerAttempt` (no `correct`): see the `youlearn-courses` skill ("Learner journey") before adding a route that returns course content.

## Auth

The browser only talks to the web origin; Next rewrites `/api/*` to the API (first-party cookies, no CORS). Sign-up is disabled; users are created by admins or the startup seed. A user holds several roles (`user`, `writer`, `admin`) stored comma separated in `user.role`: use `Role[]` through `@youlearn/auth/roles` (`parseRoles`, `isAdmin`, `canWrite`), never compare `user.role` as a string. Business rules on user creation / email change live in the Better Auth `databaseHooks` so every path is covered.

## Startup seeds (idempotent, `apps/api/src/index.ts`)

`ensureAdminUser` from `ADMIN_*`, `ensureDefaultGroups` from `DEFAULT_GROUPS` (only while no non-system group exists), `ensureCommonGroup`, `ensureBucket` (files and deprecated buckets), then the periodic `startAssetSweeper` after `listen`.

## Storage (`packages/storage`)

Talks to the S3 API only (RustFS in dev). The app never deletes a file for good: `moveToDeprecated` (see `youlearn-courses`). New env variables go in `packages/config/src/schema.ts` and `.env.example`.

## Verifying

Unit tests (`pnpm --filter api test`, Vitest, colocated `*.test.ts`) cover the pure rules only; keep new pure logic in DB-free modules so it stays testable (see `AGENTS.md`). For the rest: `pnpm check-types`, Biome on the touched files, and exercise endpoints with `curl` and a session cookie (sign in with `POST /api/auth/sign-in/email`, send an `origin: $WEB_URL` header). When scripting against the shared dev database: create dedicated test data with an obvious prefix (`zz-...`), parse ids with a real JSON parser, abort on any empty id before using it, and delete only what the script created - an unchecked id once deleted a real group.
