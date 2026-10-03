import { describe, expect, it } from "vitest";
import {
	CATALOG_DEFAULT_PAGE_SIZE,
	catalogQueryToSearchParams,
	parseCatalogQuery,
} from "./catalog-query";
import { coursesQueryToSearchParams, parseCoursesQuery } from "./courses-query";
import { eventsQueryToSearchParams, parseEventsQuery } from "./events-query";
import {
	DEFAULT_PAGE_SIZE,
	parseUsersQuery,
	usersQueryToSearchParams,
} from "./users-query";

type Params = Record<string, string | string[] | undefined>;

// The four tables keep their state in the URL with the same rules: check them once for all of them.
const tables = [
	{
		name: "users",
		parse: (params: Params) => parseUsersQuery(params),
		serialize: (query: never) => usersQueryToSearchParams(query),
		pageSize: DEFAULT_PAGE_SIZE,
		validOtherPageSize: 50,
		defaultSort: "createdAt",
	},
	{
		name: "courses",
		parse: (params: Params) => parseCoursesQuery(params),
		serialize: (query: never) => coursesQueryToSearchParams(query),
		pageSize: DEFAULT_PAGE_SIZE,
		validOtherPageSize: 50,
		defaultSort: "updatedAt",
	},
	{
		name: "events",
		parse: (params: Params) => parseEventsQuery(params),
		serialize: (query: never) => eventsQueryToSearchParams(query),
		pageSize: DEFAULT_PAGE_SIZE,
		validOtherPageSize: 50,
		defaultSort: "createdAt",
	},
	{
		name: "catalog",
		parse: (params: Params) => parseCatalogQuery(params),
		serialize: (query: never) => catalogQueryToSearchParams(query),
		pageSize: CATALOG_DEFAULT_PAGE_SIZE,
		validOtherPageSize: 24,
		defaultSort: "publishedAt",
	},
];

describe.each(tables)("$name query", (table) => {
	it("falls back to the defaults on an empty URL", () => {
		expect(table.parse({})).toMatchObject({
			sort: table.defaultSort,
			order: "desc",
			page: 1,
			pageSize: table.pageSize,
		});
	});

	it("ignores invalid values instead of failing", () => {
		const query = table.parse({
			sort: "nope",
			order: "sideways",
			page: "-3",
			pageSize: "7",
			q: "   ",
		});
		expect(query).toMatchObject({
			sort: table.defaultSort,
			order: "desc",
			page: 1,
			pageSize: table.pageSize,
		});
		expect(query.q).toBeUndefined();
	});

	it("reads the page, the page size and the search term", () => {
		expect(
			table.parse({
				page: "3",
				pageSize: String(table.validOtherPageSize),
				q: " hello ",
			}),
		).toMatchObject({
			page: 3,
			pageSize: table.validOtherPageSize,
			q: "hello",
		});
	});

	it("takes the first value of a repeated parameter", () => {
		expect(table.parse({ page: ["2", "5"] }).page).toBe(2);
	});

	it("omits the defaults when building a URL, and rebuilds the same state", () => {
		expect(table.serialize(table.parse({}) as never).toString()).toBe("");

		const query = table.parse({
			q: "hello",
			order: "asc",
			page: "2",
			pageSize: String(table.validOtherPageSize),
		});
		const params = table.serialize(query as never);
		expect(params.get("q")).toBe("hello");
		expect(params.get("order")).toBe("asc");
		expect(params.get("page")).toBe("2");
		expect(table.parse(Object.fromEntries(params))).toEqual(query);
	});
});

describe("filters", () => {
	it("keeps the known values of the users filters", () => {
		expect(parseUsersQuery({ role: "writer", status: "banned" })).toMatchObject(
			{ role: "writer", status: "banned" },
		);
		expect(
			parseUsersQuery({ role: "root", status: "gone" }).role,
		).toBeUndefined();
	});

	it("keeps the known values of the courses filters", () => {
		expect(
			parseCoursesQuery({ status: "none", groupId: "g1", category: "web" }),
		).toMatchObject({ status: "none", groupId: "g1", category: "web" });
		expect(parseCoursesQuery({ status: "deprecated" }).status).toBeUndefined();
	});

	it("only offers the catalog sorts the API knows", () => {
		expect(parseCatalogQuery({ sort: "name", order: "asc" })).toMatchObject({
			sort: "name",
			order: "asc",
		});
		// A catalog URL must not accept a sort that only exists for the writer table.
		expect(parseCatalogQuery({ sort: "updatedAt" }).sort).toBe("publishedAt");
	});

	it("accepts an event feature or a single event type as the type filter", () => {
		expect(parseEventsQuery({ type: "user" }).type).toBe("user");
		expect(parseEventsQuery({ type: "user.create" }).type).toBe("user.create");
		expect(parseEventsQuery({ type: "user.explode" }).type).toBeUndefined();
	});
});
