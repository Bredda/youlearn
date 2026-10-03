<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# YouLearn

Learning platform: courses and programs whose visibility depends on the **groups** (tags) an admin gives each user.
pnpm + Turborepo monorepo, TypeScript everywhere. Users never sign up: admins create the accounts.

## Commands

Node >= 24, pnpm 12 (run everything from the repo root).

```sh
cp .env.example .env     # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm install
pnpm db:up               # postgres 18 + RustFS S3 storage (docker/compose.yml, reads .env)
pnpm db:migrate          # apply drizzle migrations
pnpm dev                 # web :3000 + api :3001 (turbo TUI)

pnpm check-types         # tsc in every package (web runs `next typegen` first)
pnpm --filter <pkg> exec biome check --write <paths>   # lint + format the files you touched
pnpm build
pnpm db:generate         # after editing packages/db/src/schema -> commit the new migration
pnpm --filter @youlearn/auth seed:admin   # same seed the API runs at startup
```

- Format and lint with **Biome** only (tabs, no Prettier): `pnpm format` formats the repo, and while working run `pnpm --filter <pkg> exec biome check --write <paths>` on the files you touched. `apps/web/components/ui` (shadcn-generated) is excluded from Biome on purpose; CSS uses Biome's Tailwind parser.
- Known failures that are not yours: `check-types` fails on `components/ui/spinner.tsx` (generated, type error), and `pnpm lint` reports a few issues in `web` (e.g. the unused shadcn sample `components/layout/login-form.tsx`). Do not "fix" them as a side effect, but make sure you introduce no new error.
- There is no test suite yet. Verify with `check-types`, Biome on touched files, and by exercising pages/endpoints (e.g. `curl` with a session cookie).

## Layout

| Path | Role |
|---|---|
| `apps/web` | Next.js 16 App Router + shadcn (base-ui) + Tailwind 4. See `apps/web/AGENTS.md`. |
| `apps/api` | Fastify 5. Mounts Better Auth on `/api/auth/*`, exposes `/api/me` and `/api/admin/*`. |
| `packages/config` | Loads the root `.env`, validates it with zod, exports `env`. |
| `packages/db` | Drizzle client (`pg`), schema, migrations (`drizzle/`). |
| `packages/storage` | S3 client (`@aws-sdk/client-s3`) for course files: `ensureBucket`, `putObject`, `getObject` (streamed, `Range`), `objectExists`, `moveToDeprecated`, `presignGet`/`presignPut`. Only talks to the S3 API, so RustFS (dev) is swappable for any S3. |
| `packages/events` | Event log registry (`feature.action` types, pure) and `recordEvent` (`@youlearn/events/server`). |
| `packages/auth` | Better Auth instance (+ admin plugin), browser client (`@youlearn/auth/client`), admin seed. |
| `packages/types` | Type-only: row types inferred from the schema and API response shapes. |
| `packages/typescript-config`, `packages/biome-config` | Shared configs (`node.json` for packages and API, `nextjs.json` for web). |

Dependency direction: `config` <- `db` <- `events` <- `auth` <- `types` (type-only imports) <- `api` / `web`; `storage` depends only on `config` and is used by `api`. Do not create cycles.

## Architecture rules

- **Packages ship TypeScript sources** (no build step): `exports` point to `src/*.ts`. `web` consumes them through `transpilePackages` in `next.config.ts` (add new packages there), `api` bundles them with tsdown (`noExternal: [/^@youlearn\//]`). A new package needs `exports`, a `tsconfig.json` extending `node.json`, and a `biome.json` extending `@youlearn/biome-config/base`.
- **Env**: one `.env` at the repo root, read only through `@youlearn/config`. Never touch `process.env` elsewhere. A new variable goes in `packages/config/src/schema.ts` **and** `.env.example`. Client components may import only the pure `@youlearn/config/email-domain`, never the main entry (it validates the server env and reads the filesystem).
- **Database**: schema in `packages/db/src/schema/*`, columns are camelCase in code and snake_case in SQL (`casing: "snake_case"`). Never edit an applied migration. The `group` table is an SQL reserved word: always go through drizzle, never hand-written SQL. Import query helpers (`eq`, `and`, `sql`, ...) from `@youlearn/db`, which re-exports them; do not add `drizzle-orm` to other packages (pnpm resolves a broken peer copy).
- **Types**: derive from the schema (`typeof schema.x.$inferSelect`), keep `@youlearn/types` free of runtime code. API responses that cross to the web app are typed there (`PublicUser`, `AdminUser`, `AdminUserPage`...); JSON dates are strings.
- **Auth**: the browser only talks to the web origin; Next rewrites `/api/*` to the API, so cookies are first-party and there is no CORS to manage. Sign-up is disabled (`disableSignUp`). Users are created by admins (Better Auth admin plugin, called from the UI) or by the startup seed. A user holds **several roles at once** (`user`, `writer`, `admin`): Better Auth stores them comma separated in `user.role`, the rest of the code uses `Role[]` through `@youlearn/auth/roles` (`parseRoles`, `isAdmin`, `canWrite`: the writer area is open to writers and admins). Never compare `user.role` as a plain string; add a role in `roles.ts` (it is declared to the admin plugin on both server and client). Better Auth `databaseHooks` enforce `ALLOWED_EMAIL_DOMAINS` on user creation and email change: keep business rules there so every path is covered.
- **API**: one plugin per area under `apps/api/src/routes`. Admin routes must use `app.requireAdmin`, writer-area routes `app.requireWriter`, other authenticated ones `app.requireAuth`. Validate every body/query/params with zod (a `ZodError` becomes a 400). Map unique violations to 409 (`isUniqueViolation`). Prefer Better Auth endpoints for account operations (create, role, ban, password, delete) and add our own routes only for what it does not know (groups, listings joined with groups).
- **Startup seeds** (idempotent, in `apps/api/src/index.ts`): `ensureAdminUser` from `ADMIN_*`, `ensureDefaultGroups` from `DEFAULT_GROUPS` (only while the group table is empty, so deleted groups do not come back), `ensureBucket` for the S3 bucket.
- **Events** (audit log): every notable action is recorded in the `event` table with `recordEvent` (who = actor, what = `feature.action` type + target, when). Types are declared in `packages/events/src/index.ts` (`EVENTS`); adding one also requires a label in `apps/web/lib/events.ts` (compile-checked). User mutations are captured in one place, the Better Auth hooks in `packages/auth/src/user-events.ts` (the browser calls the admin plugin directly); other features call `recordEvent` after their change is committed. It never throws, and never put secrets in `metadata`. Listing: `GET /api/admin/events`, UI at `/admin/events`.
- **Groups** are the visibility mechanism: a user belongs to 0..n groups, `/api/me` returns them, and courses/programs will be tagged with groups the same way (tables not created yet).
- **Courses** (writer area, `/api/writer/*`, `lib/courses.ts`): a course needs at least one group. An admin edits every course; a writer only those sharing one of their *explicit* groups and may only add/remove their own groups (the others stay untouched, `resolveGroupIds`). The built-in **"Commun"** group (`group.system`) is visible to everyone but implicit: never a `user_group` row, so it never grants write access, only admins put it on a course, and it cannot be renamed, deleted or assigned to a user. A group used by a course cannot be deleted. A course published once is archived (`deletedAt`, admin only, its `course_group` rows removed, slug freed) instead of deleted, and its slug is frozen.
- **Courses listing** (`GET /api/writer/courses`): same server-side table pattern as users and events (`WriterCourseQuery` in `@youlearn/types`, state in the URL via `lib/courses-query.ts`, sorting/filtering/pagination in the API, shared `components/data-table/*` incl. `FilterSelect`); the response also carries the options of the filters (`categories`, `groups`) computed from the courses the user can edit.
- **Revisions** (`lib/revisions.ts`): `draft -> preview -> published -> deprecated` (+ `preview -> draft`); at most one revision per active status and course (partial unique index), any number of deprecated. Publishing deprecates the previous published one and deprecating needs `confirm: true` (409 `CONFIRM_REQUIRED` otherwise). Published revisions never change; restoring an old one = cloning it into a new draft (`parentId`). Status changes lock the course row (`for update`). Contributors are snapshots (no FK) and must be recorded with `addContributor` on every content change.
- **Course content and files**: a revision holds its lessons as a versioned jsonb manifest (`course_revision.content`, `CourseContent`: ordered lessons, markdown inline for now; validated by `lib/content.ts`). Only a **draft** is editable; saves use optimistic locking (`expectedUpdatedAt`, 409 `STALE`) and record a contributor, no event per save. Cloning copies the manifest. Files are `course_asset` rows (per course, deduplicated by `sha256`, blob at `courses/<courseId>/assets/<sha256>`, never rewritten); lessons reference them as `asset:<id>` in markdown and the course cover is `course.imageAssetId`. Everything goes through the API (the browser only talks to the web origin): upload `POST /api/writer/courses/:id/assets` (images only, type sniffed from the bytes, SVG refused, 5 MB), download `GET /api/courses/:id/assets/:assetId` (`canViewCourse`, `Range` supported, so videos can reuse it; large uploads will need presigned URLs). **The app never deletes a file for good**: `moveToDeprecated` copies it to the deprecated bucket (`S3_DEPRECATED_BUCKET`, default `<S3_BUCKET>-deprecated`, same key) then removes the original; purging that bucket is an ops decision (empty it, or give it a lifecycle rule). Archiving a course leaves its files in place (it may come back, and its published revisions are history). Hard-deleting a never-published course moves its files, and `lib/asset-sweep.ts` (run at API startup, then every 6 h) moves the files of living courses that no revision references (any status, deprecated included) and that are not the cover, once older than 24 h (an uploaded image may not be saved yet).
- **Review link**: `course_revision.previewToken` is a 256-bit secret set when a revision enters `preview` (and replaced/revoked via `POST`/`DELETE .../preview-link`, events `revision.new-link`/`revoke-link`), and cleared in the same transaction when it leaves `preview`. `GET /api/review/:token` (any signed-in user; unknown and ended tokens both give 404) returns the revision read-only; the web page is `/review/[token]`. Files are read-guarded by `canReadAsset`: editors read every file of their courses; everybody else only the cover and files used by the published revision (or, with `?review=<token>`, by the revision in review), so draft files stay private even inside the course's groups.

## Code style

- TypeScript strict with `noUncheckedIndexedAccess`; no `any`. Imports are sorted by Biome.
- Match the surrounding code (names, comment density). Comments explain *why*, not what.
- Keep changes scoped: do not reformat or "clean up" generated files (`components/ui`, `drizzle/`) beyond the task.
- Commits follow Conventional Commits (`feat:`, `fix:`...). Never commit `.env`.

## Gotchas

- pnpm 12 blocks dependency build scripts: allow them in `allowBuilds` (`pnpm-workspace.yaml`), as done for `esbuild`.
- Postgres' host port comes from `POSTGRES_PORT` (5432 may already be taken); keep `DATABASE_URL` in sync.
- `.env` is read at process start: restart `dev` after changing it. Do not leave your own `tsx watch` / `next dev` processes running: ports 3000/3001 are the user's.
- `turbo` and `next` are recent majors whose behavior differs from older docs: read the docs bundled in the installed packages (see the blocks below / in `apps/web/AGENTS.md`). The same goes for `@tanstack/react-table` (v9: `useTable`, explicit features), see its `skills/` folder.
