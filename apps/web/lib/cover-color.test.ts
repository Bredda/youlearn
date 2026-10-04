import { describe, expect, it } from "vitest";
import { COVER_COLORS, coverColor } from "./cover-color";

describe("coverColor", () => {
	it("always gives the same color to the same course", () => {
		expect(coverColor("course-1")).toBe(coverColor("course-1"));
	});

	it("only picks from the palette", () => {
		for (let i = 0; i < 50; i++) {
			expect(COVER_COLORS).toContain(coverColor(`course-${i}`));
		}
	});

	it("spreads courses over the palette", () => {
		const used = new Set(
			Array.from({ length: 200 }, (_, i) => coverColor(`id-${i}`)),
		);
		expect(used.size).toBe(COVER_COLORS.length);
	});

	it("handles an empty id", () => {
		expect(COVER_COLORS).toContain(coverColor(""));
	});
});
