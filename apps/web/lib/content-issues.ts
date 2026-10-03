import type { CourseContent } from "@youlearn/content";

type Issue = {
	path: readonly PropertyKey[];
	message: string;
	code: string;
};

/** The messages of `@youlearn/content`, in French for the editor. */
const KNOWN: [RegExp, string][] = [
	[/ids must be unique/, "Identifiants en double"],
	[
		/Only YouTube and Vimeo/,
		"Seuls les liens YouTube et Vimeo (https) sont acceptés",
	],
	[
		/exactly one correct option/,
		"Une question à choix unique a exactement une bonne réponse",
	],
	[
		/at least one correct option/,
		"Une question à choix multiple a au moins une bonne réponse",
	],
	[
		/more questions than the pool/,
		"Le nombre de questions tirées dépasse celles du quiz",
	],
	[
		/At least one question must be drawn/,
		"Au moins une question doit être tirée",
	],
	[
		/needs exactly one final exam/,
		"Un cours certifiant a exactement un examen final",
	],
	[
		/Only a certifying course has a final exam/,
		"Seul un cours certifiant a un examen final",
	],
	[
		/final exam must be the last chapter/,
		"L'examen final doit être le dernier chapitre",
	],
	[
		/final exam holds a quiz and no content blocks/,
		"L'examen final ne contient qu'un quiz, sans bloc de contenu",
	],
];

/** Where an issue sits, in the words of the editor: `Chapitre 2 › Quiz › Question 1`. */
export function issueLocation(
	content: CourseContent,
	path: readonly PropertyKey[],
): string {
	// ["chapters", 1, "blocks", 0, ...] or ["chapters", 1, "quiz", "questions", 2, "options", 0, ...]
	const [root, chapterIndex, section] = path;
	if (root !== "chapters" || typeof chapterIndex !== "number") return "Cours";
	const chapter = content.chapters[chapterIndex];
	const crumbs = [
		`Chapitre ${chapterIndex + 1}${chapter?.title ? ` (${chapter.title})` : ""}`,
	];
	if (section === "blocks" && typeof path[3] === "number") {
		crumbs.push(`Bloc ${path[3] + 1}`);
	} else if (section === "quiz") {
		crumbs.push("Quiz");
		if (path[3] === "questions" && typeof path[4] === "number") {
			crumbs.push(`Question ${path[4] + 1}`);
			if (path[5] === "options" && typeof path[6] === "number") {
				crumbs.push(`Option ${path[6] + 1}`);
			}
		}
	}
	return crumbs.join(" › ");
}

export function explainIssue(issue: Pick<Issue, "message" | "code">): string {
	const known = KNOWN.find(([pattern]) => pattern.test(issue.message));
	if (known) return known[1];
	if (issue.code === "too_small") return "Valeur manquante ou trop courte";
	if (issue.code === "too_big") return "Valeur trop longue ou trop grande";
	return "Valeur invalide";
}

export type EditorIssue = { location: string; message: string };

export function describeIssues(
	content: CourseContent,
	issues: readonly Issue[],
): EditorIssue[] {
	return issues.map((issue) => ({
		location: issueLocation(content, issue.path),
		message: explainIssue(issue),
	}));
}
