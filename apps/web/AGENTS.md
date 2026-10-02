<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web conventions

UI copy is **French**; code, identifiers and comments are English.

## Data and auth in the UI

- Server components/layouts call the API with `apiFetch` (`lib/api.ts`, forwards the visitor's cookies). `getCurrentUser()` (`lib/session.ts`) is the single source for the current user and is deduplicated per request.
- `(auth)` routes are for anonymous visitors, `(app)` for signed-in ones; each layout redirects the other case. `(app)/admin/*` is guarded by `admin/layout.tsx` and `(app)/writer/*` by `writer/layout.tsx` (menus use `isAdmin` / `canWrite` from `@youlearn/auth/roles`; the `writer` role is shown as "Formateur", see `lib/roles.ts`) (the API enforces it too: never rely on the UI alone).
- The `(app)` layout puts the user in `UserProvider`: client components read it with `useUser()` instead of fetching it. After a change, call `router.refresh()` so the layout reloads it.
- Client mutations: Better Auth calls through `authClient` (`@youlearn/auth/client`) or `callApi` (`lib/api-client.ts`) for our own routes, then `router.refresh()`. Turn Better Auth results into messages with `authError`.

## Forms (always this pattern)

Same as `components/auth/signin-form.tsx`: `useForm` from `@tanstack/react-form`, a zod schema in `validators.onSubmit`, `form.Field` with the shadcn `Field`, `FieldLabel`, `FieldError` (`data-invalid` / `aria-invalid` driven by `isTouched && !isValid`). Server-side errors are shown with `FormError` (`components/form-error.tsx`). Pending state: `Spinner` in the submit button. Dialogs holding a form are mounted only while open (`{open && <XDialog />}`) so their state resets.

## Tables

Tables with sorting/filtering/pagination use the data table building blocks in `components/data-table/` with **TanStack Table v9** (`useTable`, features registered in `features.ts`). Processing is server-side (`manual*` options): the table state lives in the URL (`lib/users-query.ts` shows how to parse and serialize it) and changing it navigates, which re-runs the server page. Keep `columns` and `data` referentially stable (`useMemo`). Fixed layout: size columns with `meta.className`. Row actions are a dedicated dropdown component per table.

## UI components

- Add shadcn components with `pnpm dlx shadcn@latest add <name>` (style `base-mira`, built on `@base-ui/react`, icons from `@hugeicons`). Compose them, do not edit `components/ui/*` unless needed (the folder is excluded from Biome).
- Theme: `next-themes` through `ThemeProvider`; use `useThemeToggle()` rather than calling it directly. Persistence and no-flash loading are handled by the library.
- Do not use unlayered global CSS resets: they override Tailwind utilities.
