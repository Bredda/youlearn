"use client";

import type { CourseGroupTag, WriterCourse } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseFormDialog } from "@/components/writer/course-form-dialog";
import { assetUrl } from "@/lib/asset-url";

/** Heading of a course in the writer area: cover, name, description, slug and tags, and the edit button. */
export function CourseHeader({
	course,
	assignableGroups,
}: {
	course: WriterCourse;
	assignableGroups: CourseGroupTag[];
}) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);

	return (
		<>
			<PageHeader
				title={course.name}
				description={course.description || undefined}
				leading={
					course.imageAssetId ? (
						// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
						<img
							src={assetUrl(course.id, course.imageAssetId)}
							alt=""
							className="hidden aspect-video h-16 shrink-0 rounded-md border object-cover sm:block"
						/>
					) : undefined
				}
				meta={
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="mr-1 font-mono text-muted-foreground text-xs">
							{course.slug}
						</span>
						{course.categories.map((category) => (
							<Badge key={category} variant="outline">
								{category}
							</Badge>
						))}
						{course.groups.map((group) => (
							<Badge key={group.id} variant="secondary">
								{group.name}
							</Badge>
						))}
					</div>
				}
			>
				<Button variant="outline" onClick={() => setEditing(true)}>
					<Icon name="edit" />
					Modifier
				</Button>
			</PageHeader>

			{editing && (
				<CourseFormDialog
					course={course}
					assignableGroups={assignableGroups}
					onClose={() => setEditing(false)}
					onDone={() => {
						setEditing(false);
						router.refresh();
					}}
				/>
			)}
		</>
	);
}
