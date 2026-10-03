import { describe, expect, it } from "vitest";
import { escapeLike } from "./sql";

describe("escapeLike", () => {
	it("leaves plain text alone", () => {
		expect(escapeLike("hello world")).toBe("hello world");
	});

	it("escapes the LIKE wildcards and the escape character", () => {
		expect(escapeLike("100%")).toBe("100\\%");
		expect(escapeLike("a_b")).toBe("a\\_b");
		expect(escapeLike("a\\b")).toBe("a\\\\b");
		expect(escapeLike("%_\\")).toBe("\\%\\_\\\\");
	});
});
