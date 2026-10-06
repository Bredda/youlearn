import type { Quiz } from "@youlearn/content";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/writer/markdown";

/**
 * Read-only view of a chapter quiz for writers and reviewers: settings, questions and the correct answers.
 * Never meant for learners (the answers are shown): their view comes from a dedicated API route.
 */
export function QuizView({ quiz, courseId }: { quiz: Quiz; courseId: string }) {
	return (
		<section className="mt-4 flex flex-col gap-3 rounded-md border p-3">
			<header className="flex flex-wrap items-center gap-2">
				<h3 className="flex items-center gap-1.5 font-semibold text-lg">
					<Icon name="quiz" /> Quiz
				</h3>
				<QuizSettingsBadges quiz={quiz} />
			</header>
			<ol className="flex flex-col gap-3">
				{quiz.questions.map((question, index) => (
					<li key={question.id} className="rounded-md border bg-muted/30 p-3">
						<div className="mb-1 flex items-center gap-2 text-muted-foreground text-xs">
							<span>Question {index + 1}</span>
							<Badge variant="outline">
								{question.type === "single" ? "Choix unique" : "Choix multiple"}
							</Badge>
						</div>
						<Markdown courseId={courseId}>{question.prompt}</Markdown>
						<ul className="mt-2 flex flex-col gap-1">
							{question.options.map((option) => (
								<li
									key={option.id}
									className={`flex items-center gap-2 rounded border px-2 py-1 text-sm ${
										option.correct ? "border-primary bg-primary/10" : ""
									}`}
								>
									{option.correct ? (
										<>
											<Icon name="confirm" className="size-4 shrink-0" />
											<span className="sr-only">Bonne réponse :</span>
										</>
									) : (
										<span className="size-4 shrink-0" />
									)}
									{option.text}
								</li>
							))}
						</ul>
						{question.explanation && (
							<div className="mt-2 border-l-2 pl-3 text-muted-foreground text-sm">
								<Markdown courseId={courseId}>{question.explanation}</Markdown>
							</div>
						)}
					</li>
				))}
			</ol>
		</section>
	);
}

/** Blocking or not, the pass rate and how many questions are drawn from the pool. */
export function QuizSettingsBadges({ quiz }: { quiz: Quiz }) {
	const pool = quiz.questions.length;
	return (
		<>
			{quiz.blocking ? (
				<Badge>
					<Icon name="blocking" /> Bloquant : {quiz.passRate} % de réussite
					requis
				</Badge>
			) : (
				<Badge variant="secondary">Non bloquant</Badge>
			)}
			<Badge variant="outline">
				{quiz.drawCount} question{quiz.drawCount > 1 ? "s" : ""} tirée
				{quiz.drawCount > 1 ? "s" : ""} parmi {pool}
			</Badge>
		</>
	);
}
