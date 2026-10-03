import { type CourseContent, contentSchema } from "@youlearn/content";
import { describe, expect, it } from "vitest";
import { describeIssues, explainIssue, issueLocation } from "./content-issues";

const content: CourseContent = {
	version: 2,
	chapters: [
		{ id: "a", title: "Intro", blocks: [] },
		{ id: "b", title: "Suite", blocks: [] },
	],
};

describe("issueLocation", () => {
	it("names chapters, blocks, questions and options as the editor shows them", () => {
		expect(issueLocation(content, ["chapters", 1, "title"])).toBe(
			"Chapitre 2 (Suite)",
		);
		expect(issueLocation(content, ["chapters", 0, "blocks", 2, "url"])).toBe(
			"Chapitre 1 (Intro) › Bloc 3",
		);
		expect(issueLocation(content, ["chapters", 0, "quiz", "drawCount"])).toBe(
			"Chapitre 1 (Intro) › Quiz",
		);
		expect(
			issueLocation(content, [
				"chapters",
				0,
				"quiz",
				"questions",
				1,
				"options",
				0,
				"text",
			]),
		).toBe("Chapitre 1 (Intro) › Quiz › Question 2 › Option 1");
		expect(issueLocation(content, ["chapters"])).toBe("Cours");
	});
});

describe("explainIssue", () => {
	it("translates the rules of the content package and falls back on the zod code", () => {
		expect(
			explainIssue({
				message: "Only YouTube and Vimeo links (https) are supported",
				code: "custom",
			}),
		).toMatch(/YouTube/);
		expect(explainIssue({ message: "Too small", code: "too_small" })).toBe(
			"Valeur manquante ou trop courte",
		);
		expect(explainIssue({ message: "?", code: "invalid_type" })).toBe(
			"Valeur invalide",
		);
	});

	it("explains every issue of a real validation failure", () => {
		const bad = {
			version: 2,
			chapters: [
				{
					id: "a",
					title: "T",
					blocks: [
						{ id: "v", type: "video", url: "https://evil.example", title: "x" },
					],
					quiz: { blocking: false, passRate: 70, drawCount: 2, questions: [] },
				},
			],
		};
		const result = contentSchema.safeParse(bad);
		expect(result.success).toBe(false);
		if (result.success) return;
		const issues = describeIssues(
			bad as unknown as CourseContent,
			result.error.issues,
		);
		expect(issues.length).toBeGreaterThan(0);
		for (const issue of issues) {
			expect(issue.location.startsWith("Chapitre 1")).toBe(true);
			expect(issue.message).not.toMatch(
				/[a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+ [a-z]+/,
			);
		}
	});
});
