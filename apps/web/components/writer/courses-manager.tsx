"use client";

import type { CourseGroupTag, WriterCourse } from "@youlearn/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	const [pending, setPending] = useState(false);

	function done() {
		setEditing(undefined);
		router.refresh();
	}

	async function onDelete() {
		if (!deleting) return;
		setPending(true);
		const message = await callApi(
			"DELETE",
			`/api/writer/courses/${deleting.id}`,
		);
		setPending(false);
		setDeleting(undefined);
		if (message) return setError(message);
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
						<TableHead className="w-48 text-right">Actions</TableHead>
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
								<Link
									href={`/writer/courses/${course.id}`}
									className="block truncate font-medium hover:underline"
								>
									{course.name}
								</Link>
								<div className="truncate text-muted-foreground text-xs">
									{course.slug}
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
							<TableCell className="space-x-2 text-right">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setEditing(course)}
								>
									Modifier
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => {
										setError(undefined);
										setDeleting(course);
									}}
								>
									Supprimer
								</Button>
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

			<AlertDialog
				open={deleting !== undefined}
				onOpenChange={(open) => !open && setDeleting(undefined)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Supprimer le cours « {deleting?.name} » ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{deleting?.everPublished
								? "Ce cours a déjà été publié : il sera archivé (seul un administrateur peut le faire) et ne sera plus visible. "
								: "Ses révisions seront supprimées avec lui. "}
							Cette action est définitive.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={onDelete}
							disabled={pending}
						>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
