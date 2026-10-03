"use client";

import type { CourseGroupTag, WriterCourse } from "@youlearn/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { FormError } from "@/components/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CourseFormDialog } from "@/components/writer/course-form-dialog";
import { CourseRowActions } from "@/components/writer/course-row-actions";
import { assetUrl } from "@/components/writer/markdown";
import { callApi } from "@/lib/api-client";
import {
	REVISION_STATUS_LABELS,
	REVISION_STATUS_VARIANTS,
} from "@/lib/revisions";

// `undefined` = closed, `null` = creating, a course = editing it.
type Editing = WriterCourse | null | undefined;

export function CoursesManager({
	courses,
	assignableGroups,
}: {
	courses: WriterCourse[];
	assignableGroups: CourseGroupTag[];
}) {
	const router = useRouter();
	const [editing, setEditing] = useState<Editing>(undefined);
	const [deleting, setDeleting] = useState<WriterCourse>();
	const [error, setError] = useState<string>();

	function done() {
		setEditing(undefined);
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">Cours</h1>
					<p className="text-muted-foreground text-sm">
						Un cours est visible des utilisateurs qui partagent au moins un de
						ses groupes.
					</p>
				</div>
				<Button
					onClick={() => setEditing(null)}
					disabled={assignableGroups.length === 0}
				>
					Nouveau cours
				</Button>
			</div>

			{assignableGroups.length === 0 && (
				<FormError>
					Vous n'appartenez à aucun groupe : demandez à un administrateur de
					vous en attribuer un pour pouvoir créer des cours.
				</FormError>
			)}
			{error && <FormError>{error}</FormError>}

			<Table className="table-fixed">
				<TableHeader>
					<TableRow>
						<TableHead>Nom</TableHead>
						<TableHead>Catégories</TableHead>
						<TableHead>Groupes</TableHead>
						<TableHead>Révisions</TableHead>
						<TableHead className="w-16 text-right">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{courses.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={5}
								className="text-center text-muted-foreground"
							>
								Aucun cours.
							</TableCell>
						</TableRow>
					)}
					{courses.map((course) => (
						<TableRow key={course.id}>
							<TableCell className="whitespace-normal">
								<div className="flex items-center gap-3">
									{course.imageAssetId && (
										// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
										<img
											src={assetUrl(course.id, course.imageAssetId)}
											alt=""
											className="size-10 shrink-0 rounded object-cover"
										/>
									)}
									<div className="min-w-0">
										<Link
											href={`/writer/courses/${course.id}`}
											className="block truncate font-medium hover:underline"
										>
											{course.name}
										</Link>
										<div className="truncate text-muted-foreground text-xs">
											{course.slug}
										</div>
									</div>
								</div>
							</TableCell>
							<TableCell className="whitespace-normal">
								<div className="flex flex-wrap gap-1">
									{course.categories.map((category) => (
										<Badge key={category} variant="outline">
											{category}
										</Badge>
									))}
								</div>
							</TableCell>
							<TableCell className="whitespace-normal">
								<div className="flex flex-wrap gap-1">
									{course.groups.map((group) => (
										<Badge key={group.id} variant="secondary">
											{group.name}
										</Badge>
									))}
								</div>
							</TableCell>
							<TableCell className="whitespace-normal">
								<div className="flex flex-wrap gap-1">
									{(["published", "preview", "draft"] as const).map(
										(status) =>
											course.current[status] && (
												<Badge
													key={status}
													variant={REVISION_STATUS_VARIANTS[status]}
												>
													{REVISION_STATUS_LABELS[status]} ·{" "}
													{course.current[status].key}
												</Badge>
											),
									)}
								</div>
							</TableCell>
							<TableCell className="text-right">
								<CourseRowActions
									course={course}
									onAction={(action, target) => {
										if (action === "edit") return setEditing(target);
										setError(undefined);
										setDeleting(target);
									}}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

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
