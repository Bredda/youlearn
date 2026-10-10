import { describe, expect, it } from "vitest";
import {
	learnersQueryToSearchParams,
	parseLearnersQuery,
} from "./learners-query";

describe("learners query", () => {
	it("has no filter by default", () => {
		const query = parseLearnersQuery({});
		expect(query.outdated).toBeUndefined();
		expect(query.status).toBeUndefined();
		expect(learnersQueryToSearchParams(query).toString()).toBe("");
	});

	it("reads the outdated filter, which only exists as outdated=true", () => {
		expect(parseLearnersQuery({ outdated: "true" }).outdated).toBe(true);
		for (const junk of ["false", "1", "yes", "", "TRUE"])
			expect(parseLearnersQuery({ outdated: junk }).outdated).toBeUndefined();
		expect(parseLearnersQuery({ outdated: ["true", "x"] }).outdated).toBe(true);
	});

	it("writes it back, with the other filters, and drops it when off", () => {
		const query = parseLearnersQuery({
			outdated: "true",
			status: "in_progress",
		});
		const params = learnersQueryToSearchParams(query);
		expect(params.get("outdated")).toBe("true");
		expect(params.get("status")).toBe("in_progress");
		expect(
			learnersQueryToSearchParams({ ...query, outdated: undefined }).has(
				"outdated",
			),
		).toBe(false);
	});

	it("round-trips", () => {
		const query = parseLearnersQuery({ outdated: "true", q: "ada", page: "2" });
		expect(
			parseLearnersQuery(
				Object.fromEntries(learnersQueryToSearchParams(query)),
			),
		).toEqual(query);
	});
});
