import type { CourseGroupTag, WriterCourse } from "@youlearn/types";
import { describe, expect, it } from "vitest";
import {
	type CourseActor,
	canEditCourse,
	canViewCourse,
	normalizeCategories,
	resolveGroupIds,
	slugify,
} from "./course-rules";

const group = (id: string, system = false): CourseGroupTag => ({
	id,
	name: id,
	system,
});
const COMMUN = group("commun", true);

const actor = (overrides: Partial<CourseActor> = {}): CourseActor => ({
	id: "u1",
	label: "u1@example.com",
	name: "U1",
	admin: false,
	groupIds: [],
	...overrides,
});

const course = (groups: CourseGroupTag[]): WriterCourse => ({
	id: "c1",
	name: "Course",
	slug: "course",
	description: "",
	categories: [],
	imageAssetId: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	groups,
	current: {},
	everPublished: false,
});

describe("slugify", () => {
	it("lower-cases, strips accents and joins words with hyphens", () => {
		expect(slugify("Développement Web 101")).toBe("developpement-web-101");
	});

	it("collapses separators and trims the hyphens at both ends", () => {
		expect(slugify("  --Hello,   World!--  ")).toBe("hello-world");
	});

	it("gives an empty slug when nothing usable is left", () => {
		expect(slugify("¿?!")).toBe("");
		expect(slugify("日本語")).toBe("");
	});

	it("keeps at most 80 characters", () => {
		expect(slugify("a".repeat(120))).toHaveLength(80);
	});
});

describe("normalizeCategories", () => {
	it("trims, lower-cases, drops empty tags and duplicates", () => {
		expect(
			normalizeCategories([" Web ", "web", "", "JavaScript", "  "]),
		).toEqual(["web", "javascript"]);
	});
});

describe("canEditCourse", () => {
	it("lets an admin edit everything", () => {
		expect(canEditCourse(actor({ admin: true }), course([group("a")]))).toBe(
			true,
		);
	});

	it("lets a writer edit the courses sharing one of their groups", () => {
		const writer = actor({ groupIds: ["a"] });
		expect(canEditCourse(writer, course([group("a"), group("b")]))).toBe(true);
		expect(canEditCourse(writer, course([group("b")]))).toBe(false);
	});

	it("never grants edition through Commun, which nobody holds explicitly", () => {
		expect(canEditCourse(actor({ groupIds: ["a"] }), course([COMMUN]))).toBe(
			false,
		);
	});
});

describe("canViewCourse", () => {
	it("shows a Commun course to everybody, even without any group", () => {
		expect(canViewCourse(actor(), course([COMMUN]))).toBe(true);
	});

	it("shows a course to the members of one of its groups only", () => {
		const member = actor({ groupIds: ["a"] });
		expect(canViewCourse(member, course([group("a")]))).toBe(true);
		expect(canViewCourse(member, course([group("b")]))).toBe(false);
		expect(canViewCourse(actor(), course([group("a")]))).toBe(false);
	});

	it("shows everything to an admin", () => {
		expect(canViewCourse(actor({ admin: true }), course([group("b")]))).toBe(
			true,
		);
	});
});

describe("resolveGroupIds", () => {
	const writer = actor({ groupIds: ["a", "b"] });
	const manageable = [group("a"), group("b")];

	it("uses the requested groups on a new course", () => {
		expect(resolveGroupIds(writer, manageable, [], ["a"])).toEqual({
			ids: ["a"],
		});
	});

	it("drops duplicates in the request", () => {
		expect(resolveGroupIds(writer, manageable, [], ["a", "a", "b"])).toEqual({
			ids: ["a", "b"],
		});
	});

	it("keeps the groups the writer cannot manage (other teams, Commun)", () => {
		const current = [group("a"), group("other"), COMMUN];
		expect(resolveGroupIds(writer, manageable, current, ["b"])).toEqual({
			ids: ["other", "commun", "b"],
		});
	});

	it("needs at least one requested group", () => {
		expect(resolveGroupIds(writer, manageable, [group("other")], [])).toEqual({
			error: "A course needs at least one group",
			status: 400,
		});
	});

	it("refuses a writer a group that is not theirs with a 403", () => {
		expect(resolveGroupIds(writer, manageable, [], ["other"])).toEqual({
			error: "You can only assign your own groups",
			status: 403,
		});
	});

	it("answers an admin an unknown group with a 400", () => {
		const admin = actor({ admin: true });
		expect(resolveGroupIds(admin, manageable, [], ["nope"])).toEqual({
			error: "Unknown group id",
			status: 400,
		});
	});
});
