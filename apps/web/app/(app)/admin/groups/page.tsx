import type { GroupWithMemberCount } from "@youlearn/types";
import type { Metadata } from "next";
import { GroupsManager } from "@/components/admin/groups-manager";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Groupes" };

export default async function AdminGroupsPage() {
	const response = await apiFetch("/api/admin/groups");
	if (!response.ok) throw new Error("Impossible de charger les groupes");
	const { groups } = (await response.json()) as {
		groups: GroupWithMemberCount[];
	};

	return <GroupsManager groups={groups} />;
}
