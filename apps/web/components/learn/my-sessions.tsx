import type { MyEnrollment } from "@youlearn/types";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { assetUrl } from "@/lib/asset-url";
import {
	ENROLLMENT_STATUS_LABELS,
	ENROLLMENT_STATUS_VARIANTS,
} from "@/lib/enrollments";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

/** The courses the learner started: where they stand, and a way back in. */
export function MySessions({ enrollments }: { enrollments: MyEnrollment[] }) {
	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title="Mes sessions"
				description="Les cours que vous avez commencés, avec votre progression."
			/>
			{enrollments.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Vous n'avez commencé aucun cours.{" "}
					<Link href="/courses" className="underline">
						Parcourir les cours
					</Link>
				</p>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{enrollments.map((enrollment) => (
						<li key={enrollment.id} className="grid">
							<Session enrollment={enrollment} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function Session({ enrollment }: { enrollment: MyEnrollment }) {
	const percent =
		enrollment.totalChapters === 0
			? 0
			: Math.round(
					(enrollment.completedChapters / enrollment.totalChapters) * 100,
				);
	return (
		<Card>
			{enrollment.imageAssetId && (
				// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
				<img
					src={assetUrl(enrollment.courseId, enrollment.imageAssetId)}
					alt=""
					className="aspect-video w-full object-cover"
				/>
			)}
			<CardHeader>
				<CardTitle
					className="line-clamp-2 text-base"
					title={enrollment.courseName}
				>
					{enrollment.courseName}
				</CardTitle>
				<CardDescription>
					Commencé le {dateFormat.format(new Date(enrollment.startedAt))} ·
					révision {enrollment.revisionKey}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={ENROLLMENT_STATUS_VARIANTS[enrollment.status]}>
						{ENROLLMENT_STATUS_LABELS[enrollment.status]}
					</Badge>
					{enrollment.certifying && (
						<Badge variant="outline">
							<Icon name="certifying" /> Certifiant
						</Badge>
					)}
				</div>
				<div className="flex flex-col gap-1">
					<progress
						className="h-2 w-full accent-primary"
						value={enrollment.completedChapters}
						max={Math.max(1, enrollment.totalChapters)}
						aria-label="Progression"
					/>
					<span className="text-muted-foreground text-xs">
						{enrollment.completedChapters} / {enrollment.totalChapters}{" "}
						chapitres terminés ({percent} %)
					</span>
				</div>
				{enrollment.outdated && enrollment.status !== "failed" && (
					<p className="text-muted-foreground text-xs">
						Une version plus récente du cours existe : vous suivez la vôtre.
					</p>
				)}
				<div className="mt-auto">
					{enrollment.status === "failed" ? (
						<Button
							nativeButton={false}
							render={<Link href={`/courses/${enrollment.courseId}`} />}
						>
							<Icon name="retry" /> Recommencer
						</Button>
					) : (
						<Button
							variant={
								enrollment.status === "completed" ? "outline" : "default"
							}
							nativeButton={false}
							render={<Link href={`/learn/${enrollment.id}`} />}
						>
							<Icon
								name={enrollment.status === "completed" ? "open" : "start"}
							/>
							{enrollment.status === "completed"
								? "Relire le cours"
								: "Continuer"}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
