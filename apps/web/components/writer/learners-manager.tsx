"use client";

import {
	type OnChangeFn,
	type PaginationState,
	type SortingState,
	useTable,
} from "@tanstack/react-table";
import type {
	CourseEnrollment,
	CourseEnrollmentPage,
	CourseEnrollmentQuery,
} from "@youlearn/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { dataTableFeatures } from "@/components/data-table/features";
import { PendingIcon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LearnerDetailDialog } from "@/components/writer/learner-detail-dialog";
import type { LearnerAction } from "@/components/writer/learner-row-actions";
import { createLearnerColumns } from "@/components/writer/learners-columns";
import { LearnersToolbar } from "@/components/writer/learners-toolbar";
import { learnersQueryToSearchParams } from "@/lib/learners-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/users-query";

type Props = CourseEnrollmentPage & {
	courseId: string;
	courseName: string;
	/** Table state, read from the URL by the page. */
	query: CourseEnrollmentQuery;
};

export function LearnersManager({
	courseId,
	courseName,
	enrollments,
	total,
	query,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [viewing, setViewing] = useState<CourseEnrollment>();
	const basePath = `/writer/courses/${courseId}/learners`;

	const sorting: SortingState = [
		{ id: query.sort, desc: query.order === "desc" },
	];
	const pagination: PaginationState = {
		pageIndex: query.page - 1,
		pageSize: query.pageSize,
	};

	/** Sorting, filtering and pagination are done by the API: the table state lives in the URL. */
	function navigate(patch: Partial<CourseEnrollmentQuery>) {
		const next = { ...query, ...patch };
		if (!("page" in patch)) next.page = 1; // any other change goes back to the first page
		const params = learnersQueryToSearchParams(next);
		startTransition(() =>
			router.push(`${basePath}${params.size ? `?${params}` : ""}`),
		);
	}

	const onSortingChange: OnChangeFn<SortingState> = (updater) => {
		const [sort] = typeof updater === "function" ? updater(sorting) : updater;
		if (sort) {
			navigate({
				sort: sort.id as CourseEnrollmentQuery["sort"],
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

	const onAction = useCallback(
		(_action: LearnerAction, enrollment: CourseEnrollment) =>
			setViewing(enrollment),
		[],
	);

	// Columns must keep a stable reference between renders.
	const columns = useMemo(() => createLearnerColumns({ onAction }), [onAction]);

	const table = useTable({
		features: dataTableFeatures,
		columns,
		data: enrollments,
		getRowId: (enrollment) => enrollment.id,
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
			<Link
				href={`/writer/courses/${courseId}`}
				className="text-muted-foreground text-sm hover:underline"
			>
				← {courseName}
			</Link>
			<PageHeader
				title="Apprenants"
				description={`Qui suit « ${courseName} », jusqu'où, et le résultat à l'examen final.`}
			>
				<Button
					variant="outline"
					disabled={isPending}
					onClick={() => startTransition(() => router.refresh())}
				>
					<PendingIcon pending={isPending} name="refresh" />
					Actualiser
				</Button>
			</PageHeader>

			<LearnersToolbar
				key={query.q ?? ""}
				query={query}
				onChange={navigate}
				onReset={() =>
					navigate({
						q: undefined,
						status: undefined,
						sort: "startedAt",
						order: "desc",
						pageSize: DEFAULT_PAGE_SIZE,
					})
				}
			/>

			<div className={isPending ? "opacity-60 transition-opacity" : undefined}>
				<DataTable table={table} emptyMessage="Aucun apprenant." />
			</div>

			<DataTablePagination table={table} />

			{viewing && (
				<LearnerDetailDialog
					courseId={courseId}
					enrollment={viewing}
					onClose={() => setViewing(undefined)}
				/>
			)}
		</div>
	);
}
