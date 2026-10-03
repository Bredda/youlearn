import type { CatalogCourse } from "@youlearn/types";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { assetUrl } from "@/components/writer/markdown";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

/** A course of the catalog. No action yet: the card only presents the course. */
export function CourseCard({ course }: { course: CatalogCourse }) {
	return (
		<Card>
			{course.imageAssetId ? (
				// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
				<img
					src={assetUrl(course.id, course.imageAssetId)}
					alt=""
					className="aspect-video w-full object-cover"
				/>
			) : (
				<div
					aria-hidden="true"
					className="aspect-video w-full bg-muted"
					data-slot="cover-placeholder"
				/>
			)}
			<CardHeader>
				<CardTitle className="line-clamp-2 text-base" title={course.name}>
					{course.name}
				</CardTitle>
				<CardDescription>
					Publié le {dateFormat.format(new Date(course.publishedAt))}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-3">
				{course.description && (
					<p className="line-clamp-3 text-muted-foreground">
						{course.description}
					</p>
				)}
				{course.categories.length > 0 && (
					<div className="mt-auto flex flex-wrap gap-1">
						{course.categories.map((category) => (
							<Badge key={category} variant="outline">
								{category}
							</Badge>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
