import { env } from "@youlearn/config";
import type { AdminUserPage, GroupWithMemberCount } from "@youlearn/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersManager } from "@/components/admin/users-manager";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { parseUsersQuery, usersQueryToSearchParams } from "@/lib/users-query";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const query = parseUsersQuery(await searchParams);

	const [usersResponse, groupsResponse, currentUser] = await Promise.all([
		apiFetch(`/api/admin/users?${usersQueryToSearchParams(query)}`),
		apiFetch("/api/admin/groups"),
		getCurrentUser(),
	]);
	if (!usersResponse.ok || !groupsResponse.ok || !currentUser) {
		throw new Error("Impossible de charger les utilisateurs");
	}

	const users = (await usersResponse.json()) as AdminUserPage;
	const { groups: allGroups } = (await groupsResponse.json()) as {
		groups: GroupWithMemberCount[];
	};
	// "Commun" applies to everyone implicitly: it is neither assigned nor a useful filter.
	const groups = allGroups.filter((group) => !group.system);

	// The last page no longer exists (e.g. its only user was deleted): go to the new last one.
	const pageCount = Math.max(1, Math.ceil(users.total / query.pageSize));
	if (query.page > pageCount) {
		const params = usersQueryToSearchParams({ ...query, page: pageCount });
		redirect(`/admin/users${params.size ? `?${params}` : ""}`);
	}

	return (
		<UsersManager
			{...users}
			query={query}
			groups={groups}
			currentUserId={currentUser.id}
			allowedEmailDomains={env.ALLOWED_EMAIL_DOMAINS}
		/>
	);
}
