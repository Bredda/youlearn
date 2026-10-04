import { formatDuration } from "@youlearn/content";
import type { CatalogCourse } from "@youlearn/types";
import Link from "next/link";
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
import {
	ENROLLMENT_STATUS_ICONS,
	ENROLLMENT_STATUS_LABELS,
	ENROLLMENT_STATUS_VARIANTS,
} from "@/lib/enrollments";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

/** A course of the catalog; the whole card opens the course sheet. */
export function CourseCard({ course }: { course: CatalogCourse }) {
	return (
		<Link
			href={`/courses/${course.id}`}
			className="group grid rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Card className="transition-colors group-hover:bg-muted/50">
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
					{(course.durationMinutes > 0 ||
						course.certifying ||
						course.enrollmentStatus) && (
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
							{course.enrollmentStatus && (
								<Badge
									variant={ENROLLMENT_STATUS_VARIANTS[course.enrollmentStatus]}
								>
									<Icon
										name={ENROLLMENT_STATUS_ICONS[course.enrollmentStatus]}
									/>
									{ENROLLMENT_STATUS_LABELS[course.enrollmentStatus]}
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
		</Link>
	);
}
