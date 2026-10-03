import type {
	Block,
	Chapter,
	CourseContent,
	Question,
	QuestionOption,
	Quiz,
} from "@youlearn/content";

/**
 * Pure edits of the content tree held by the revision editor. Ids are passed in by the caller (the reducer
 * stays deterministic) and never regenerated: the diff pairs items by id.
 */

export const newId = () => crypto.randomUUID();

export const newMarkdownBlock = (id = newId()): Block => ({
	id,
	type: "markdown",
	body: "",
});

export const newVideoBlock = (id = newId()): Block => ({
	id,
	type: "video",
	url: "",
	title: "",
});

export const newChapter = (id = newId()): Chapter => ({
	id,
	title: "Nouveau chapitre",
	blocks: [],
});

const newOption = (correct: boolean): QuestionOption => ({
	id: newId(),
	text: "",
	correct,
});

export const newQuestion = (): Question => ({
	id: newId(),
	type: "single",
	prompt: "",
	options: [newOption(true), newOption(false)],
});

export const newQuiz = (): Quiz => ({
	blocking: false,
	passRate: 70,
	drawCount: 1,
	questions: [newQuestion()],
});

export type EditAction =
	| { type: "reset"; content: CourseContent }
	| { type: "addChapter"; chapter: Chapter }
	| { type: "moveChapter"; from: number; to: number }
	| { type: "removeChapter"; chapterId: string }
	| { type: "renameChapter"; chapterId: string; title: string }
	| { type: "addBlock"; chapterId: string; block: Block }
	| { type: "moveBlock"; chapterId: string; from: number; to: number }
	| { type: "removeBlock"; chapterId: string; blockId: string }
	| {
			type: "updateBlock";
			chapterId: string;
			blockId: string;
			patch: Partial<{ body: string; url: string; title: string }>;
	  }
	| { type: "addQuiz"; chapterId: string }
	| { type: "removeQuiz"; chapterId: string }
	| {
			type: "updateQuiz";
			chapterId: string;
			patch: Partial<Pick<Quiz, "blocking" | "passRate" | "drawCount">>;
	  }
	| { type: "addQuestion"; chapterId: string; question: Question }
	| { type: "moveQuestion"; chapterId: string; from: number; to: number }
	| { type: "removeQuestion"; chapterId: string; questionId: string }
	| {
			type: "updateQuestion";
			chapterId: string;
			questionId: string;
			patch: Partial<Pick<Question, "prompt" | "explanation" | "type">>;
	  }
	| { type: "addOption"; chapterId: string; questionId: string }
	| {
			type: "updateOption";
			chapterId: string;
			questionId: string;
			optionId: string;
			text: string;
	  }
	| {
			type: "setCorrect";
			chapterId: string;
			questionId: string;
			optionId: string;
			correct: boolean;
	  }
	| {
			type: "removeOption";
			chapterId: string;
			questionId: string;
			optionId: string;
	  };

export function moveItem<T>(items: T[], from: number, to: number): T[] {
	if (from === to || from < 0 || to < 0) return items;
	if (from >= items.length || to >= items.length) return items;
	const next = [...items];
	const [item] = next.splice(from, 1);
	if (item === undefined) return items;
	next.splice(to, 0, item);
	return next;
}

const mapChapter = (
	content: CourseContent,
	chapterId: string,
	edit: (chapter: Chapter) => Chapter,
): CourseContent => ({
	...content,
	chapters: content.chapters.map((c) => (c.id === chapterId ? edit(c) : c)),
});

const mapQuiz = (
	content: CourseContent,
	chapterId: string,
	edit: (quiz: Quiz) => Quiz,
): CourseContent =>
	mapChapter(content, chapterId, (chapter) =>
		chapter.quiz ? { ...chapter, quiz: edit(chapter.quiz) } : chapter,
	);

const mapQuestion = (
	content: CourseContent,
	chapterId: string,
	questionId: string,
	edit: (question: Question) => Question,
): CourseContent =>
	mapQuiz(content, chapterId, (quiz) => ({
		...quiz,
		questions: quiz.questions.map((q) => (q.id === questionId ? edit(q) : q)),
	}));

/** `drawCount` follows the pool: never more questions drawn than the pool holds. */
const clampDraw = (quiz: Quiz): Quiz => ({
	...quiz,
	drawCount: Math.max(
		1,
		Math.min(quiz.drawCount, Math.max(quiz.questions.length, 1)),
	),
});

/** A single choice keeps exactly one correct option: the first one when it held several. */
const normalizeCorrect = (question: Question): Question => {
	if (question.type !== "single") return question;
	const first = question.options.findIndex((o) => o.correct);
	return {
		...question,
		options: question.options.map((o, i) => ({
			...o,
			correct: i === Math.max(first, 0),
		})),
	};
};

export function editContent(
	content: CourseContent,
	action: EditAction,
): CourseContent {
	switch (action.type) {
		case "reset":
			return action.content;
		case "addChapter":
			return { ...content, chapters: [...content.chapters, action.chapter] };
		case "moveChapter":
			return {
				...content,
				chapters: moveItem(content.chapters, action.from, action.to),
			};
		case "removeChapter":
			return {
				...content,
				chapters: content.chapters.filter((c) => c.id !== action.chapterId),
			};
		case "renameChapter":
			return mapChapter(content, action.chapterId, (c) => ({
				...c,
				title: action.title,
			}));
		case "addBlock":
			return mapChapter(content, action.chapterId, (c) => ({
				...c,
				blocks: [...c.blocks, action.block],
			}));
		case "moveBlock":
			return mapChapter(content, action.chapterId, (c) => ({
				...c,
				blocks: moveItem(c.blocks, action.from, action.to),
			}));
		case "removeBlock":
			return mapChapter(content, action.chapterId, (c) => ({
				...c,
				blocks: c.blocks.filter((b) => b.id !== action.blockId),
			}));
		case "updateBlock":
			return mapChapter(content, action.chapterId, (c) => ({
				...c,
				blocks: c.blocks.map((block): Block => {
					if (block.id !== action.blockId) return block;
					const { body, url, title } = action.patch;
					if (block.type === "markdown") {
						return body === undefined ? block : { ...block, body };
					}
					return {
						...block,
						...(url !== undefined && { url }),
						...(title !== undefined && { title }),
					};
				}),
			}));
		case "addQuiz":
			return mapChapter(content, action.chapterId, (c) =>
				c.quiz ? c : { ...c, quiz: newQuiz() },
			);
		case "removeQuiz":
			return mapChapter(content, action.chapterId, ({ quiz: _, ...c }) => c);
		case "updateQuiz":
			return mapQuiz(content, action.chapterId, (quiz) =>
				clampDraw({ ...quiz, ...action.patch }),
			);
		case "addQuestion":
			return mapQuiz(content, action.chapterId, (quiz) => ({
				...quiz,
				questions: [...quiz.questions, action.question],
			}));
		case "moveQuestion":
			return mapQuiz(content, action.chapterId, (quiz) => ({
				...quiz,
				questions: moveItem(quiz.questions, action.from, action.to),
			}));
		case "removeQuestion":
			return mapQuiz(content, action.chapterId, (quiz) =>
				clampDraw({
					...quiz,
					questions: quiz.questions.filter((q) => q.id !== action.questionId),
				}),
			);
		case "updateQuestion":
			return mapQuestion(content, action.chapterId, action.questionId, (q) =>
				normalizeCorrect({ ...q, ...action.patch }),
			);
		case "addOption":
			return mapQuestion(content, action.chapterId, action.questionId, (q) => ({
				...q,
				options: [...q.options, newOption(false)],
			}));
		case "updateOption":
			return mapQuestion(content, action.chapterId, action.questionId, (q) => ({
				...q,
				options: q.options.map((o) =>
					o.id === action.optionId ? { ...o, text: action.text } : o,
				),
			}));
		case "setCorrect":
			return mapQuestion(content, action.chapterId, action.questionId, (q) => ({
				...q,
				options: q.options.map((o) => {
					if (o.id === action.optionId)
						return { ...o, correct: action.correct };
					// Choosing an answer of a single choice question unchecks the previous one.
					return q.type === "single" && action.correct
						? { ...o, correct: false }
						: o;
				}),
			}));
		case "removeOption":
			return mapQuestion(content, action.chapterId, action.questionId, (q) => ({
				...q,
				options: q.options.filter((o) => o.id !== action.optionId),
			}));
	}
}
