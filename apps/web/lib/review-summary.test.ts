import { describe, expect, it } from "vitest";
import { reviewWarnings } from "./review-summary";

const summary = {
	approved: 0,
	changesRequested: 0,
	pending: 0,
	stale: 0,
	openThreads: 0,
};

describe("reviewWarnings", () => {
	it("has nothing to say without a review or when it is done", () => {
		expect(reviewWarnings(null)).toEqual([]);
		expect(reviewWarnings({ ...summary, approved: 2 })).toEqual([]);
	});

	it("lists what is open, singular and plural", () => {
		expect(
			reviewWarnings({
				approved: 0,
				changesRequested: 1,
				pending: 2,
				stale: 1,
				openThreads: 3,
			}),
		).toEqual([
			"1 relecteur demande des modifications",
			"2 relecteurs n'ont pas encore donné d'avis",
			"1 avis date d'avant les dernières modifications",
			"3 remarques restent ouvertes",
		]);
		expect(reviewWarnings({ ...summary, openThreads: 1 })).toEqual([
			"1 remarque reste ouverte",
		]);
	});
});
