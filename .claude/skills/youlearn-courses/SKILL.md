---
name: youlearn-courses
description: The YouLearn courses domain - groups and the built-in Commun group, admin/writer permissions on courses, the course revision workflow (draft, preview, published, deprecated), lesson content and its optimistic locking, course files and images, the deprecated bucket and orphan sweep, review links and who can read what. Use when touching courses, revisions, lessons, assets or images, review links, or the group-based visibility.
---

# Courses domain

Key files: `apps/api/src/lib/{courses,revisions,content,assets,asset-sweep}.ts`, `routes/writer/{courses,revisions}.ts`, `routes/{assets,review}.ts`, `packages/db/src/schema/{courses,groups}.ts`; UI in `apps/web/components/writer/*`, `components/review/*`. For API and UI conventions see `youlearn-api` and `youlearn-ui`.

## Groups

Groups are the visibility mechanism: a user belongs to 0..n groups (`/api/me` returns them) and courses are tagged with groups. The built-in **"Commun"** group (`group.system`, created at startup, an admin-made group with that name is adopted) is visible to everyone but **implicit**: never a `user_group` row (the API refuses it), so it never grants write access; it cannot be renamed or deleted and is hidden from the user form and filters. A group used by a course cannot be deleted (`restrict` foreign key plus a clear 409).

## Courses

Writer area `/api/writer/*`. A course needs at least one group. An admin edits every course; a writer only those sharing one of their *explicit* groups, and may only add/remove their own groups: the others (other teams, Commun) stay untouched (`resolveGroupIds`, `assignableGroups`). Only admins put Commun on a course. A course published once is archived instead of deleted (`deletedAt`, admin only, its `course_group` rows removed so groups can be deleted, slug freed) and its slug is frozen; a never-published course is really deleted. Name, description, categories (free lower-cased tags) and cover are not versioned.

Listing: `GET /api/writer/courses` follows the server-side table pattern (`WriterCourseQuery`, filters on search, status, group, category) and also returns the filter options computed from the courses the user can edit.

## Revisions

`draft -> preview -> published -> deprecated` (+ `preview -> draft`); at most one revision per active status and course (partial unique index), any number of deprecated. Publishing deprecates the previous published revision, and deprecating needs `confirm: true` (409 `CONFIRM_REQUIRED` otherwise; the UI shows a confirmation naming the revision). Published revisions never change; restoring an old one means cloning it into a new draft (`parentId`). Status changes lock the course row (`for update`). The business id (`key`, Docker-like `whispering_toucan`) is unique per course and immutable. Contributors are snapshots (no FK) and must be recorded with `addContributor` on every content change. Only a draft can be deleted or edited; a preview goes back to draft to be reworked.

## Content and files

A revision holds its lessons as a versioned jsonb manifest (`course_revision.content`, `CourseContent`: ordered lessons, markdown inline for now; validated by `lib/content.ts`). Saves use optimistic locking (`expectedUpdatedAt`, 409 `STALE`), record a contributor, and log no event. Cloning copies the manifest.

Files are `course_asset` rows (per course, deduplicated by `sha256`, blob at `courses/<courseId>/assets/<sha256>`, never rewritten); lessons reference them as `asset:<id>` in markdown and the cover is `course.imageAssetId`. Everything goes through the API: upload `POST /api/writer/courses/:id/assets` (images only, type sniffed from the bytes, SVG refused, 5 MB), download `GET /api/courses/:id/assets/:assetId` (`Range` supported so videos can reuse it; large uploads will need presigned URLs).

**The app never deletes a file for good**: `moveToDeprecated` copies it to the deprecated bucket (`S3_DEPRECATED_BUCKET`, default `<S3_BUCKET>-deprecated`, same key) then removes the original; purging that bucket is an ops decision. Archiving a course leaves its files in place. Hard-deleting a never-published course moves its files, and `lib/asset-sweep.ts` (at API startup, then every 6 h) moves the files of living courses that no revision references (any status, deprecated included) and that are not the cover, once older than 24 h (an uploaded image may not be saved yet).

## Review link and file access

`course_revision.previewToken` is a 256-bit secret set when a revision enters `preview` (replaced/revoked via `POST`/`DELETE .../preview-link`, events `revision.new-link`/`revoke-link`) and cleared in the same transaction when it leaves `preview`. `GET /api/review/:token` (any signed-in user; unknown and ended tokens both give 404) returns the revision read-only; the web page is `/review/[token]`.

`canReadAsset`: editors read every file of their courses; everybody else only the cover and the files used by the published revision (or, with `?review=<token>`, by the revision in review), so draft files stay private even inside the course's groups.

## Not built yet

Learner catalog (reading published revisions), enrollment and progress (progress will reference `revision_id`), programs, videos and large uploads.
