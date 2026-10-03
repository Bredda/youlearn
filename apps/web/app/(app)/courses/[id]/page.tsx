import { formatDuration } from "@youlearn/content";
import type { LearnerCourse } from "@youlearn/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { EnrollButton } from "@/components/learn/enroll-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { assetUrl } from "@/lib/asset-url";

export const metadata: Metadata = { title: "Cours" };

export default async function CoursePage(props: PageProps<"/courses/[id]">) {
	const { id } = await props.params;
	const response = await apiFetch(`/api/courses/${encodeURIComponent(id)}`);
	if (response.status === 404) notFound();
	if (!response.ok) throw new Error("Impossible de charger le cours");
	const course = (await response.json()) as LearnerCourse;
	const { enrollment } = course;

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title={course.name}
				description={course.description || undefined}
			/>
			<div className="flex flex-wrap items-center gap-2">
				{course.durationMinutes > 0 && (
					<Badge variant="outline">
						<Icon name="duration" />
						{formatDuration(course.durationMinutes)}
					</Badge>
				)}
				{course.certifying && (
					<Badge variant="outline">
						<Icon name="certifying" /> Certifiant
					</Badge>
				)}
				{course.categories.map((category) => (
					<Badge key={category} variant="outline">
						{category}
					</Badge>
				))}
			</div>

			<div className="grid gap-6 md:grid-cols-[1fr_20rem]">
				<section className="flex flex-col gap-2">
					<h2 className="font-medium">Programme</h2>
					<ol className="flex flex-col gap-1">
						{course.chapters.map((chapter, index) => (
							<li
								key={chapter.id}
								className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
							>
								<span className="min-w-0 flex-1 truncate">
									{index + 1}. {chapter.title}
								</span>
								{chapter.kind === "final-exam" && (
									<Badge variant="outline">
										<Icon name="certifying" /> Examen final
									</Badge>
								)}
								{chapter.estimatedMinutes !== null && (
									<span className="text-muted-foreground">
										{formatDuration(chapter.estimatedMinutes)}
									</span>
								)}
							</li>
						))}
					</ol>
				</section>

				<aside className="flex flex-col gap-3">
					{course.imageAssetId && (
						// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
						<img
							src={assetUrl(course.id, course.imageAssetId)}
							alt=""
							className="aspect-video w-full rounded-md border object-cover"
						/>
					)}
					{!enrollment && <EnrollButton courseId={course.id} />}
					{enrollment?.status === "in_progress" && (
						<Button
							nativeButton={false}
							render={<Link href={`/learn/${enrollment.id}`} />}
						>
							<Icon name="start" /> Continuer le cours
						</Button>
					)}
					{enrollment?.status === "completed" && (
						<>
							<Badge variant="secondary" className="self-start">
								Cours terminé
							</Badge>
							<Button
								variant="outline"
								nativeButton={false}
								render={<Link href={`/learn/${enrollment.id}`} />}
							>
								<Icon name="open" /> Relire le cours
							</Button>
						</>
					)}
					{enrollment?.status === "failed" && (
						<>
							<p className="text-sm">
								L'examen final n'a pas été réussi. Vous pouvez recommencer le
								cours depuis le début.
							</p>
							<EnrollButton courseId={course.id} restart />
						</>
					)}
					{enrollment &&
						enrollment.status !== "failed" &&
						enrollment.outdated && (
							<p className="text-muted-foreground text-sm">
								Une version plus récente du cours a été publiée. Vous continuez
								la version {enrollment.revisionKey}, celle de votre inscription.
							</p>
						)}
				</aside>
			</div>
		</div>
	);
}
