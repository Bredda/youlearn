import {
	type BlockDiff,
	type ChangeStatus,
	type ChapterDiff,
	type ContentDiff,
	formatDuration,
	type OptionDiff,
	type QuestionDiff,
	type QuizDiff,
	type QuizSetting,
} from "@youlearn/content";
import { LineDiff } from "@/components/content/line-diff";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/asset-url";

const STATUS_LABELS: Record<ChangeStatus, string> = {
	added: "Ajouté",
	removed: "Retiré",
	modified: "Modifié",
	unchanged: "Inchangé",
};

const STATUS_TINTS: Record<ChangeStatus, string> = {
	added: "bg-green-500/15 text-green-700 dark:text-green-400",
	removed: "bg-red-500/15 text-red-700 dark:text-red-400",
	modified: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
	unchanged: "",
};

const MOVED_TINT = "bg-sky-500/15 text-sky-700 dark:text-sky-400";

function StatusBadges({
	status,
	moved,
}: {
	status: ChangeStatus;
	moved: boolean;
}) {
	return (
		<>
			{status !== "unchanged" && (
				<Badge
					variant="outline"
					className={`border-transparent ${STATUS_TINTS[status]}`}
				>
					{STATUS_LABELS[status]}
				</Badge>
			)}
			{moved && (
				<Badge variant="outline" className={`border-transparent ${MOVED_TINT}`}>
					Déplacé
				</Badge>
			)}
		</>
	);
}

const minutesLabel = (minutes: number | undefined) =>
	minutes === undefined ? "non estimée" : formatDuration(minutes);

const changed = (item: { status: ChangeStatus; moved: boolean }) =>
	item.status !== "unchanged" || item.moved;

const ASSET_REF = /asset:([\w-]+)/g;
const assetIds = (text: string) =>
	new Set([...text.matchAll(ASSET_REF)].map((m) => m[1] ?? ""));

/** Images that only one side uses, shown as before / after: a file is the same file when its asset id is. */
function ImageChanges({
	block,
	courseId,
	reviewToken,
}: {
	block: BlockDiff;
	courseId: string;
	reviewToken?: string | undefined;
}) {
	const before = assetIds(
		block.before?.type === "markdown" ? block.before.body : "",
	);
	const after = assetIds(
		block.after?.type === "markdown" ? block.after.body : "",
	);
	const removed = [...before].filter((id) => !after.has(id));
	const added = [...after].filter((id) => !before.has(id));
	if (removed.length === 0 && added.length === 0) return null;
	const thumb = (id: string, label: string, tint: string) => (
		<figure key={`${label}${id}`} className="flex flex-col gap-1">
			{/* biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image */}
			<img
				src={assetUrl(courseId, id, reviewToken)}
				alt={label}
				className={`h-24 rounded border-2 object-contain ${tint}`}
			/>
			<figcaption className="text-muted-foreground text-xs">{label}</figcaption>
		</figure>
	);
	return (
		<div className="flex flex-wrap gap-3">
			{removed.map((id) => thumb(id, "Image retirée", "border-red-500"))}
			{added.map((id) => thumb(id, "Image ajoutée", "border-green-500"))}
		</div>
	);
}

function BlockChange({
	block,
	courseId,
	reviewToken,
}: {
	block: BlockDiff;
	courseId: string;
	reviewToken?: string | undefined;
}) {
	const kind = (block.after ?? block.before)?.type;
	const video = (b: BlockDiff["before"]) => (b?.type === "video" ? b : null);
	return (
		<li className="flex flex-col gap-2 rounded-md border p-3">
			<div className="flex items-center gap-2 text-sm">
				<Icon
					name={kind === "video" ? "videoBlock" : "textBlock"}
					className="size-4"
				/>
				<span className="font-medium">
					{kind === "video" ? "Vidéo" : "Texte"}
				</span>
				<StatusBadges status={block.status} moved={block.moved} />
			</div>
			{block.lines.length > 0 && block.status !== "unchanged" && (
				<LineDiff changes={block.lines} />
			)}
			<ImageChanges
				block={block}
				courseId={courseId}
				reviewToken={reviewToken}
			/>
			{(video(block.before) || video(block.after)) &&
				block.status !== "unchanged" && (
					<dl className="grid gap-1 text-sm">
						{(["url", "title"] as const).map((field) => {
							const from = video(block.before)?.[field];
							const to = video(block.after)?.[field];
							if (from === to) return null;
							return (
								<div key={field} className="flex flex-wrap gap-2">
									<dt className="text-muted-foreground">
										{field === "url" ? "Lien" : "Titre"} :
									</dt>
									<dd className="break-all">
										{from && (
											<del className="text-red-700 dark:text-red-400">
												{from}
											</del>
										)}
										{from && to && " → "}
										{to && (
											<ins className="text-green-700 no-underline dark:text-green-400">
												{to}
											</ins>
										)}
									</dd>
								</div>
							);
						})}
					</dl>
				)}
		</li>
	);
}

const SETTING_LABELS: Record<QuizSetting, string> = {
	blocking: "Bloquant",
	passRate: "Taux de réussite",
	drawCount: "Questions tirées",
};

function settingValue(
	setting: QuizSetting,
	value: boolean | number | undefined,
) {
	if (setting === "blocking") return value ? "oui" : "non";
	return setting === "passRate" ? `${value} %` : String(value);
}

function OptionChange({ option }: { option: OptionDiff }) {
	const text = (option.after ?? option.before)?.text ?? "";
	const note = option.correctChanged
		? option.after?.correct
			? "devient une bonne réponse"
			: "n'est plus une bonne réponse"
		: null;
	return (
		<li className="flex flex-wrap items-center gap-2 text-sm">
			<StatusBadges status={option.status} moved={option.moved} />
			<span className={option.status === "removed" ? "line-through" : ""}>
				{text}
			</span>
			{option.status === "modified" &&
				option.before &&
				option.before.text !== text && (
					<span className="text-muted-foreground">
						(avant : {option.before.text})
					</span>
				)}
			{note && (
				<Badge
					variant="outline"
					className={`border-transparent ${STATUS_TINTS.modified}`}
				>
					{note}
				</Badge>
			)}
		</li>
	);
}

function QuestionChange({ question }: { question: QuestionDiff }) {
	const promptChanged = question.promptLines.some((l) => l.kind !== "equal");
	const explanationChanged = question.explanationLines.some(
		(l) => l.kind !== "equal",
	);
	return (
		<li className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
			<div className="flex items-center gap-2 text-sm">
				<span className="font-medium">Question</span>
				<StatusBadges status={question.status} moved={question.moved} />
				{question.typeChanged && (
					<Badge
						variant="outline"
						className={`border-transparent ${STATUS_TINTS.modified}`}
					>
						Type : {question.before?.type === "single" ? "unique" : "multiple"}{" "}
						→ {question.after?.type === "single" ? "unique" : "multiple"}
					</Badge>
				)}
			</div>
			{(promptChanged || question.status !== "unchanged") && (
				<LineDiff changes={question.promptLines} />
			)}
			<ul className="flex flex-col gap-1">
				{question.options
					.filter((o) => o.status !== "unchanged" || o.moved)
					.map((option) => (
						<OptionChange key={option.id} option={option} />
					))}
			</ul>
			{explanationChanged && (
				<div className="flex flex-col gap-1">
					<span className="text-muted-foreground text-xs">Explication</span>
					<LineDiff changes={question.explanationLines} />
				</div>
			)}
		</li>
	);
}

function QuizChange({ quiz }: { quiz: QuizDiff }) {
	return (
		<section className="flex flex-col gap-2 rounded-md border p-3">
			<div className="flex items-center gap-2 text-sm">
				<Icon name="quiz" className="size-4" />
				<span className="font-medium">Quiz</span>
				<StatusBadges status={quiz.status} moved={false} />
			</div>
			{quiz.settingsChanged.length > 0 && quiz.before && quiz.after && (
				<ul className="text-sm">
					{quiz.settingsChanged.map((setting) => (
						<li key={setting}>
							{SETTING_LABELS[setting]} :{" "}
							<del className="text-red-700 dark:text-red-400">
								{settingValue(setting, quiz.before?.[setting])}
							</del>
							{" → "}
							<ins className="text-green-700 no-underline dark:text-green-400">
								{settingValue(setting, quiz.after?.[setting])}
							</ins>
						</li>
					))}
				</ul>
			)}
			<ul className="flex flex-col gap-2">
				{quiz.questions.filter(changed).map((question) => (
					<QuestionChange key={question.id} question={question} />
				))}
			</ul>
		</section>
	);
}

function ChapterChange({
	chapter,
	courseId,
	reviewToken,
}: {
	chapter: ChapterDiff;
	courseId: string;
	reviewToken?: string | undefined;
}) {
	const title = (chapter.after ?? chapter.before)?.title ?? "";
	const { linesAdded, linesRemoved } = chapter.stats;
	return (
		<details
			className="group rounded-md border"
			open={chapter.status !== "unchanged"}
		>
			<summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2">
				<Icon name="chapter" className="size-4" />
				<span className="font-medium">{title}</span>
				{chapter.titleChanged && chapter.before && (
					<span className="text-muted-foreground text-sm">
						(avant : {chapter.before.title})
					</span>
				)}
				<StatusBadges status={chapter.status} moved={chapter.moved} />
				{(chapter.after ?? chapter.before)?.kind === "final-exam" && (
					<Badge variant="outline">
						<Icon name="certifying" /> Examen final
					</Badge>
				)}
				{(linesAdded > 0 || linesRemoved > 0) && (
					<span className="ml-auto font-mono text-xs">
						<span className="text-green-700 dark:text-green-400">
							+{linesAdded}
						</span>{" "}
						<span className="text-red-700 dark:text-red-400">
							−{linesRemoved}
						</span>
					</span>
				)}
			</summary>
			<div className="flex flex-col gap-3 border-t p-3">
				{chapter.durationChanged && (
					<p className="text-sm">
						Durée estimée :{" "}
						<del className="text-red-700 dark:text-red-400">
							{minutesLabel(chapter.before?.estimatedMinutes)}
						</del>
						{" → "}
						<ins className="text-green-700 no-underline dark:text-green-400">
							{minutesLabel(chapter.after?.estimatedMinutes)}
						</ins>
					</p>
				)}
				{chapter.blocks.some(changed) && (
					<ul className="flex flex-col gap-3">
						{chapter.blocks.filter(changed).map((block) => (
							<BlockChange
								key={block.id}
								block={block}
								courseId={courseId}
								reviewToken={reviewToken}
							/>
						))}
					</ul>
				)}
				{chapter.quiz && chapter.quiz.status !== "unchanged" && (
					<QuizChange quiz={chapter.quiz} />
				)}
				{chapter.status === "unchanged" && chapter.moved && (
					<p className="text-muted-foreground text-sm">
						Seule la position du chapitre a changé.
					</p>
				)}
			</div>
		</details>
	);
}

/** Summary line of a diff: how many things changed and how many lines of text moved. */
export function DiffSummary({ diff }: { diff: ContentDiff }) {
	if (!diff.changed) return <span>Aucune différence.</span>;
	const { changes, linesAdded, linesRemoved } = diff.stats;
	return (
		<span>
			{changes} changement{changes > 1 ? "s" : ""} ·{" "}
			<span className="font-mono text-green-700 dark:text-green-400">
				+{linesAdded}
			</span>{" "}
			<span className="font-mono text-red-700 dark:text-red-400">
				−{linesRemoved}
			</span>{" "}
			lignes
		</span>
	);
}

/** What changed between two revisions, chapter by chapter. Computed by `diffContent`, shown the same everywhere. */
export function RevisionDiff({
	diff,
	courseId,
	reviewToken,
}: {
	diff: ContentDiff;
	courseId: string;
	reviewToken?: string | undefined;
}) {
	const unchanged = diff.chapters.filter((c) => !changed(c));
	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm">
				<DiffSummary diff={diff} />
			</p>
			{diff.certifyingChanged && (
				<p className="flex items-center gap-2 text-sm">
					<Icon name="certifying" className="size-4" />
					Le cours{" "}
					{diff.chapters.some((c) => c.after?.kind === "final-exam")
						? "devient certifiant"
						: "n'est plus certifiant"}
					.
				</p>
			)}
			{diff.chapters.filter(changed).map((chapter) => (
				<ChapterChange
					key={chapter.id}
					chapter={chapter}
					courseId={courseId}
					reviewToken={reviewToken}
				/>
			))}
			{unchanged.length > 0 && (
				<details className="text-sm">
					<summary className="cursor-pointer text-muted-foreground">
						{unchanged.length} chapitre{unchanged.length > 1 ? "s" : ""}{" "}
						inchangé
						{unchanged.length > 1 ? "s" : ""}
					</summary>
					<ul className="mt-2 flex flex-col gap-1 pl-4">
						{unchanged.map((chapter) => (
							<li key={chapter.id}>{chapter.after?.title}</li>
						))}
					</ul>
				</details>
			)}
		</div>
	);
}
