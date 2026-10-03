"use client";

import {
	type OnChangeFn,
	type PaginationState,
	type SortingState,
	useTable,
} from "@tanstack/react-table";
import type {
	CourseGroupTag,
	WriterCourse,
	WriterCoursePage,
	WriterCourseQuery,
} from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { dataTableFeatures } from "@/components/data-table/features";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CourseFormDialog } from "@/components/writer/course-form-dialog";
import type { CourseAction } from "@/components/writer/course-row-actions";
import { createCourseColumns } from "@/components/writer/courses-columns";
import { CoursesToolbar } from "@/components/writer/courses-toolbar";
import { callApi } from "@/lib/api-client";
import { coursesQueryToSearchParams } from "@/lib/courses-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/users-query";

// `undefined` = closed, `null` = creating, a course = editing it.
type Editing = WriterCourse | null | undefined;

type Props = WriterCoursePage & {
	/** Table state, read from the URL by the page. */
	query: WriterCourseQuery;
	assignableGroups: CourseGroupTag[];
};

export function CoursesManager({
	courses,
	total,
	categories,
	groups,
	query,
	assignableGroups,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [editing, setEditing] = useState<Editing>(undefined);
	const [deleting, setDeleting] = useState<WriterCourse>();
	const [error, setError] = useState<string>();

	const sorting: SortingState = [
		{ id: query.sort, desc: query.order === "desc" },
	];
	const pagination: PaginationState = {
		pageIndex: query.page - 1,
		pageSize: query.pageSize,
	};

	/** Sorting, filtering and pagination are done by the API: the table state lives in the URL. */
	function navigate(patch: Partial<WriterCourseQuery>) {
		const next = { ...query, ...patch };
		if (!("page" in patch)) next.page = 1; // any other change goes back to the first page
		const params = coursesQueryToSearchParams(next);
		startTransition(() =>
			router.push(`/writer/courses${params.size ? `?${params}` : ""}`),
		);
	}

	const onSortingChange: OnChangeFn<SortingState> = (updater) => {
		const [sort] = typeof updater === "function" ? updater(sorting) : updater;
		if (sort) {
			navigate({
				sort: sort.id as WriterCourseQuery["sort"],
				order: sort.desc ? "desc" : "asc",
			});
		}
	};

	const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
		const next = typeof updater === "function" ? updater(pagination) : updater;
		if (next.pageSize !== pagination.pageSize) {
			navigate({ pageSize: next.pageSize, page: 1 });
		} else {
			navigate({ page: next.pageIndex + 1 });
		}
	};

	function done() {
		setEditing(undefined);
		router.refresh();
	}

	const onAction = useCallback((action: CourseAction, course: WriterCourse) => {
		setError(undefined);
		if (action === "edit") setEditing(course);
		else setDeleting(course);
	}, []);

	// Columns must keep a stable reference between renders.
	const columns = useMemo(() => createCourseColumns({ onAction }), [onAction]);

	const table = useTable({
		features: dataTableFeatures,
		columns,
		data: courses,
		getRowId: (course) => course.id,
		manualSorting: true,
		manualPagination: true,
		rowCount: total,
		enableMultiSort: false,
		enableSortingRemoval: false,
		autoResetPageIndex: false,
		state: { sorting, pagination },
		onSortingChange,
		onPaginationChange,
	});

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title="Cours"
				description="Un cours est visible des utilisateurs qui partagent au moins un de ses groupes."
			>
				<Button
					variant="outline"
					disabled={isPending}
					onClick={() => startTransition(() => router.refresh())}
				>
					<PendingIcon pending={isPending} name="refresh" />
					Actualiser
				</Button>
				<Button
					onClick={() => setEditing(null)}
					disabled={assignableGroups.length === 0}
				>
					<Icon name="add" />
					Nouveau cours
				</Button>
			</PageHeader>

			{assignableGroups.length === 0 && (
				<FormError>
					Vous n'appartenez à aucun groupe : demandez à un administrateur de
					vous en attribuer un pour pouvoir créer des cours.
				</FormError>
			)}

			<CoursesToolbar
				key={query.q ?? ""}
				query={query}
				groups={groups}
				categories={categories}
				onChange={navigate}
				onReset={() =>
					navigate({
						q: undefined,
						status: undefined,
						groupId: undefined,
						category: undefined,
						sort: "updatedAt",
						order: "desc",
						pageSize: DEFAULT_PAGE_SIZE,
					})
				}
			/>

			{error && <FormError>{error}</FormError>}

			<div className={isPending ? "opacity-60 transition-opacity" : undefined}>
				<DataTable table={table} emptyMessage="Aucun cours." />
			</div>

			<DataTablePagination table={table} />

			{editing !== undefined && (
				<CourseFormDialog
					course={editing ?? undefined}
					assignableGroups={assignableGroups}
					onClose={() => setEditing(undefined)}
					onDone={done}
				/>
			)}

			{deleting && (
				<ConfirmDeleteDialog
					title={`Supprimer le cours « ${deleting.name} » ?`}
					description={`${
						deleting.everPublished
							? "Ce cours a déjà été publié : il sera archivé (seul un administrateur peut le faire) et ne sera plus visible. "
							: "Ses révisions seront supprimées avec lui. "
					}Cette action est définitive.`}
					expected={deleting.name}
					onConfirm={() =>
						callApi("DELETE", `/api/writer/courses/${deleting.id}`)
					}
					onClose={() => setDeleting(undefined)}
					onDone={() => {
						setDeleting(undefined);
						router.refresh();
					}}
				/>
			)}
		</div>
	);
}
