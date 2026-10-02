import type { AdminEventPage } from "@youlearn/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EventsManager } from "@/components/admin/events-manager";
import { apiFetch } from "@/lib/api";
import {
	eventsQueryToSearchParams,
	parseEventsQuery,
} from "@/lib/events-query";

export const metadata: Metadata = { title: "Événements" };

export default async function AdminEventsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const query = parseEventsQuery(await searchParams);

	const response = await apiFetch(
		`/api/admin/events?${eventsQueryToSearchParams(query)}`,
	);
	if (!response.ok) throw new Error("Impossible de charger les événements");
	const events = (await response.json()) as AdminEventPage;

	// The requested page no longer exists (filter narrowed, events purged...): go to the last one.
	const pageCount = Math.max(1, Math.ceil(events.total / query.pageSize));
	if (query.page > pageCount) {
		const params = eventsQueryToSearchParams({ ...query, page: pageCount });
		redirect(`/admin/events${params.size ? `?${params}` : ""}`);
	}

	return <EventsManager {...events} query={query} />;
}
