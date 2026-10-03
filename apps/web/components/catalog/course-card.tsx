import { formatDuration } from "@youlearn/content";
import type { CatalogCourse } from "@youlearn/types";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { assetUrl } from "@/lib/asset-url";

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
				{(course.durationMinutes > 0 || course.certifying) && (
					<div className="flex flex-wrap items-center gap-2 text-sm">
						{course.durationMinutes > 0 && (
							<span className="flex items-center gap-1 text-muted-foreground">
								<Icon name="duration" className="size-4" />
								{formatDuration(course.durationMinutes)}
							</span>
						)}
						{course.certifying && (
							<Badge variant="secondary">
								<Icon name="certifying" /> Certifiant
							</Badge>
						)}
					</div>
				)}
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
