import { diffContent } from "@youlearn/content";
import type {
	WriterCourse,
	WriterRevision,
	WriterRevisionDetail,
} from "@youlearn/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RevisionDiff } from "@/components/content/revision-diff";
import { PageHeader } from "@/components/page-header";
import { CompareSelectors } from "@/components/writer/compare-selectors";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Comparer des révisions" };

const first = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

async function loadRevision(courseId: string, revisionId: string) {
	const response = await apiFetch(
		`/api/writer/courses/${courseId}/revisions/${revisionId}`,
	);
	if (response.status === 404 || response.status === 403) notFound();
	if (!response.ok) throw new Error("Impossible de charger la révision");
	return ((await response.json()) as { revision: WriterRevisionDetail })
		.revision;
}

/** Difference between any two revisions of a course, whatever their status (deprecated included). */
export default async function ComparePage(props: {
	params: Promise<{ id: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { id } = await props.params;
	const query = await props.searchParams;

	const [courseResponse, revisionsResponse] = await Promise.all([
		apiFetch(`/api/writer/courses/${id}`),
		apiFetch(`/api/writer/courses/${id}/revisions`),
	]);
	if (
		[403, 404].includes(courseResponse.status) ||
		[403, 404].includes(revisionsResponse.status)
	)
		notFound();
	if (!courseResponse.ok || !revisionsResponse.ok)
		throw new Error("Impossible de charger le cours");
	const { course } = (await courseResponse.json()) as { course: WriterCourse };
	const { revisions } = (await revisionsResponse.json()) as {
		revisions: WriterRevision[];
	};

	// Defaults: the newest revision against the one it was cloned from, else against the published one.
	const toId = first(query.to) ?? revisions[0]?.id;
	const target = revisions.find((r) => r.id === toId);
	// A revision that is asked for but does not belong to this course.
	if (first(query.to) && !target) notFound();
	const fromId =
		first(query.from) ??
		target?.parentId ??
		revisions.find((r) => r.status === "published" && r.id !== toId)?.id ??
		undefined;

	const back = (
		<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
			{target && (
				<Link
					href={`/writer/courses/${id}/revisions/${target.id}`}
					className="text-muted-foreground hover:underline"
				>
					← {target.status === "draft" ? "Retour à l'édition de" : "Retour à"}{" "}
					{target.key}
				</Link>
			)}
			<Link
				href={`/writer/courses/${id}`}
				className="text-muted-foreground hover:underline"
			>
				{course.name}
			</Link>
		</div>
	);

	if (!toId || !target) {
		return (
			<div className="flex flex-col gap-4">
				{back}
				<PageHeader title="Comparer des révisions" />
				<p className="text-muted-foreground text-sm">
					Ce cours n'a pas encore de révision à comparer.
				</p>
			</div>
		);
	}

	const [to, from] = await Promise.all([
		loadRevision(id, toId),
		fromId ? loadRevision(id, fromId) : Promise.resolve(null),
	]);
	const diff = from ? diffContent(from.content, to.content) : null;

	return (
		<div className="flex flex-col gap-4">
			{back}
			<PageHeader
				title="Comparer des révisions"
				description={`${course.name} : ce qui change de la base à la révision choisie.`}
			/>
			<CompareSelectors
				courseId={id}
				revisions={revisions}
				from={from?.id}
				to={to.id}
			/>
			{from && (
				<dl className="grid gap-2 text-sm sm:grid-cols-2">
					{[
						{ label: "Base", revision: from },
						{ label: "Révision", revision: to },
					].map(({ label, revision }) => (
						<div key={label} className="rounded-md border px-3 py-2">
							<dt className="text-muted-foreground">
								{label} :{" "}
								<Link
									href={`/writer/courses/${id}/revisions/${revision.id}`}
									className="font-medium text-foreground hover:underline"
								>
									{revision.key}
								</Link>
							</dt>
							<dd className="whitespace-pre-wrap">{revision.purpose}</dd>
						</div>
					))}
				</dl>
			)}
			{diff ? (
				<RevisionDiff diff={diff} courseId={id} />
			) : (
				<p className="text-muted-foreground text-sm">
					Choisissez la révision de base pour voir ce qui a changé.
				</p>
			)}
		</div>
	);
}
