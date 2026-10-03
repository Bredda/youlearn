---
name: youlearn-ui
description: Conventions for the YouLearn web UI (apps/web, Next.js App Router, shadcn/base-ui, TanStack Form and Table v9) - pages, page headings, forms, server-side data tables with row-action menus, delete confirmations, centralized icons, dialogs, auth and data fetching from components. Use whenever creating or modifying anything under apps/web.
---

# YouLearn web UI

UI copy is **French**; code, identifiers and comments are English. The API enforces every permission: never rely on the UI alone.

Next.js and `@tanstack/react-table` are recent majors that differ from older docs: read `apps/web/node_modules/next/dist/docs/` and the `skills/` folder of `@tanstack/react-table` before using their APIs.

## Data and auth

- Server components/layouts call the API with `apiFetch` (`lib/api.ts`, forwards the visitor's cookies). `getCurrentUser()` (`lib/session.ts`) is the single source for the current user and is deduplicated per request.
- `(auth)` routes are for anonymous visitors, `(app)` for signed-in ones; each layout redirects the other case. `(app)/admin/*` is guarded by `admin/layout.tsx` and `(app)/writer/*` by `writer/layout.tsx` (menus use `isAdmin` / `canWrite` from `@youlearn/auth/roles`; the `writer` role is shown as "Formateur", see `lib/roles.ts`).
- The `(app)` layout puts the user in `UserProvider`: client components read it with `useUser()` instead of fetching it. After a change, call `router.refresh()` so the layout reloads it.
- Client mutations: Better Auth calls through `authClient` (`@youlearn/auth/client`) or `callApi` (`lib/api-client.ts`, returns an error message or null) for our own routes, then `router.refresh()`. Turn Better Auth results into messages with `authError`.
- Dynamic pages type their props with the generated `PageProps<"/route/[param]">` and `await props.params`.
- Files (images of lessons, covers) are served by the API under `/api/courses/:id/assets/:assetId`; build URLs with `assetUrl` (`components/writer/markdown.tsx`) and render lesson markdown with its `Markdown` component (no raw HTML, `asset:<id>` links resolved).

## Page headings

Use `PageHeader` (`components/page-header.tsx`): `title`, optional `description` and, as children, the buttons shown on the right (create, refresh...). It draws the separator under the heading. Never write a page `<h1>` by hand.

## Forms (always this pattern)

Same as `components/auth/signin-form.tsx`: `useForm` from `@tanstack/react-form`, a zod schema in `validators.onSubmit`, `form.Field` with the shadcn `Field`, `FieldLabel`, `FieldError` (`data-invalid` / `aria-invalid` driven by `isTouched && !isValid`). Server-side errors are shown with `FormError` (`components/form-error.tsx`). The submit button shows `<PendingIcon pending={pending} name="save" />` (see Icons). Dialogs holding a form are mounted only while open (`{open && <XDialog />}`) so their state resets.

## Tables (server-side)

Tables with sorting, filtering and pagination are executed by the API; the state lives in the URL. Existing examples to copy: users (`admin/users`), events, courses (`writer/courses`). The pieces:

- `lib/<thing>-query.ts`: zod parse of the search params (anything invalid falls back to its default) and the inverse `...ToSearchParams` (defaults omitted). The query type is shared with the API through `@youlearn/types` (`AdminUserQuery`, `WriterCourseQuery`...). Page sizes come from `lib/users-query.ts`.
- The server `page.tsx` parses the query, calls the API with the same params, and redirects to the last page when the requested one no longer exists.
- A client `*-manager.tsx` using `useTable` (TanStack v9, features in `components/data-table/features.ts`, `manualSorting`/`manualPagination`, `rowCount`); `navigate(patch)` rebuilds the URL inside `startTransition` and resets to page 1 unless the patch sets `page`.
- `*-columns.tsx`: a `createXColumns({ onAction })` factory; sortable column ids are the API sort keys; size columns with `meta.className`. Keep `columns` and `data` referentially stable (`useMemo`, `useCallback`).
- `*-toolbar.tsx`: search form plus `FilterSelect` (`components/data-table/filter-select.tsx`) for each filter and a reset button; remount it with `key` when the search term changes from outside. Filter options (groups, categories) come from the API response.
- `DataTable` and `DataTablePagination` render the table.

Small static tables (a handful of rows, like groups or the revisions of a course) may use the plain shadcn `Table`.

## Row actions

Row actions are **a dedicated dropdown component per table** (`user-row-actions.tsx`, `course-row-actions.tsx`, `revision-row-actions.tsx`, `group-row-actions.tsx`): a ghost icon button (`Icon name="more"`, `aria-label="Actions pour <nom>"`) opening a `DropdownMenu` whose items have icons, with a separator before the destructive ones (`variant="destructive"`). They receive `onAction(action, row)`; the manager owns the dialogs. Never put action buttons directly in table cells; the actions column is `w-16 text-right` with an `sr-only` header.

## Delete confirmations

Every deletion goes through `ConfirmDeleteDialog` (`components/confirm-delete-dialog.tsx`), GitHub style: the user types the exact name of what they destroy (email of a user, name of a group or course, key of a revision). Mount it only while open, give it a title, a description of what will be lost, `expected`, and `onConfirm` (returns an error message or null, like `callApi`). Confirmations that destroy nothing (publish, deprecate) are plain `AlertDialog`s.

## Icons

Icons are centralized in `lib/icons.ts`, by meaning (`add`, `edit`, `delete`, `open`, `publish`...). Use `<Icon name="delete" />` (`components/icon.tsx`) and, in a button that starts an action, `<PendingIcon pending={pending} name="save" />` (the icon becomes a spinner while it runs). Never import `@hugeicons/*` icons outside `components/ui` and those two files; to add an icon, give it a name in the registry. Every action button and menu item has its icon, except plain dismiss buttons ("Annuler"). Navigation items take an `IconName`.

## Components and styling

- Add shadcn components with `pnpm dlx shadcn@latest add <name>` (style `base-mira`, built on `@base-ui/react`). Compose them, do not edit `components/ui/*` unless needed (the folder is excluded from Biome, and Biome must not reformat generated files such as `components/layout/app-sidebar.tsx`: run it only on the files you touched).
- Theme: `next-themes` through `ThemeProvider`; use `useThemeToggle()` rather than calling it directly.
- Do not use unlayered global CSS resets: they override Tailwind utilities.

## Verifying

There is no browser available to the agent and no test suite: run `pnpm check-types`, Biome on the touched files, and load the pages with `curl` and a session cookie (sign in through the API) to check they render. State clearly what was not exercised interactively.
