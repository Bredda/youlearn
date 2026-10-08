import { describe, expect, it } from "vitest";
import { buildBreadcrumb } from "./breadcrumbs";

describe("buildBreadcrumb", () => {
	it("has none outside the writer area", () => {
		expect(buildBreadcrumb([])).toEqual([]);
		expect(buildBreadcrumb(["courses", "abc"])).toEqual([]);
		expect(buildBreadcrumb(["admin", "users"])).toEqual([]);
	});

	it("starts with the area, which is not a link", () => {
		expect(buildBreadcrumb(["writer", "programs"])).toEqual([
			{ label: "Formateur" },
			{ label: "Parcours" },
		]);
	});

	it("shows the course list as the current page", () => {
		expect(buildBreadcrumb(["writer", "courses"])).toEqual([
			{ label: "Formateur" },
			{ label: "Cours" },
		]);
	});

	it("names the course and its default tab", () => {
		expect(
			buildBreadcrumb(["writer", "courses", "c1"], { course: "Docker" }),
		).toEqual([
			{ label: "Formateur" },
			{ label: "Cours", href: "/writer/courses" },
			{ label: "Docker", href: "/writer/courses/c1" },
			{ label: "Révisions actuelles" },
		]);
	});

	it("links the course and names the tab", () => {
		expect(
			buildBreadcrumb(["writer", "courses", "c1", "learners"], {
				course: "Docker",
			}),
		).toEqual([
			{ label: "Formateur" },
			{ label: "Cours", href: "/writer/courses" },
			{ label: "Docker", href: "/writer/courses/c1" },
			{ label: "Apprenants" },
		]);
		expect(
			buildBreadcrumb(["writer", "courses", "c1", "history"]).at(-1),
		).toEqual({ label: "Anciennes révisions" });
	});

	it("names a revision by its key", () => {
		expect(
			buildBreadcrumb(["writer", "courses", "c1", "revisions", "r1"], {
				course: "Docker",
				revision: "calm_otter",
			}).at(-1),
		).toEqual({ label: "Révision calm_otter" });
	});

	it("falls back to generic labels while a name is unknown", () => {
		expect(
			buildBreadcrumb(["writer", "courses", "c1", "revisions", "r1"]),
		).toEqual([
			{ label: "Formateur" },
			{ label: "Cours", href: "/writer/courses" },
			{ label: "Cours", href: "/writer/courses/c1" },
			{ label: "Révision" },
		]);
	});
});
