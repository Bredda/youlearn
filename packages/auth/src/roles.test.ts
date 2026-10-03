import { describe, expect, it } from "vitest";
import { canWrite, isAdmin, parseRoles, serializeRoles } from "./roles";

describe("parseRoles", () => {
	it("splits the comma separated value Better Auth stores", () => {
		expect(parseRoles("admin,writer")).toEqual(["admin", "writer"]);
		expect(parseRoles(" admin , writer ")).toEqual(["admin", "writer"]);
	});

	it("drops unknown roles and duplicates", () => {
		expect(parseRoles("writer,root,writer")).toEqual(["writer"]);
	});

	it("falls back to a plain user when nothing valid is left", () => {
		expect(parseRoles(undefined)).toEqual(["user"]);
		expect(parseRoles(null)).toEqual(["user"]);
		expect(parseRoles("")).toEqual(["user"]);
		expect(parseRoles("root")).toEqual(["user"]);
	});
});

describe("serializeRoles", () => {
	it("writes the roles in canonical order whatever the input order", () => {
		expect(serializeRoles(["admin", "user", "writer"])).toBe(
			"user,writer,admin",
		);
	});

	it("is the inverse of parseRoles", () => {
		expect(parseRoles(serializeRoles(["writer", "admin"]))).toEqual([
			"writer",
			"admin",
		]);
	});
});

describe("permissions", () => {
	it("recognises an admin", () => {
		expect(isAdmin(["user", "admin"])).toBe(true);
		expect(isAdmin(["user", "writer"])).toBe(false);
	});

	it("opens the writer area to writers and, implicitly, to admins", () => {
		expect(canWrite(["writer"])).toBe(true);
		expect(canWrite(["admin"])).toBe(true);
		expect(canWrite(["user"])).toBe(false);
	});
});
