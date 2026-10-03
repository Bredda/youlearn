import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { ROLE_LABELS } from "@/lib/roles";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Mon profil" };

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="text-sm">{children}</dd>
		</div>
	);
}

export default async function MePage() {
	const user = await getCurrentUser();
	if (!user) redirect("/auth/signin");

	return (
		<div className="flex max-w-2xl flex-col gap-4">
			<PageHeader title="Mon profil" />

			<Card>
				<CardHeader className="flex-row items-center gap-4">
					<UserAvatar user={user} size="lg" className="size-16" />
					<div className="min-w-0">
						<CardTitle className="truncate text-lg">{user.name}</CardTitle>
						<CardDescription className="truncate">{user.email}</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<dl className="flex flex-col gap-4">
						<Row label="Nom">{user.name}</Row>
						<Row label="Email">
							{user.email}
							{!user.emailVerified && (
								<span className="ml-2 text-muted-foreground text-xs">
									(non vérifié)
								</span>
							)}
						</Row>
						<Row label="Rôles">
							<div className="flex flex-wrap gap-1">
								{user.roles.map((role) => (
									<Badge
										key={role}
										variant={role === "admin" ? "default" : "secondary"}
									>
										{ROLE_LABELS[role]}
									</Badge>
								))}
							</div>
						</Row>
						<Row label="Groupes">
							<div className="flex flex-wrap gap-1">
								{user.groups.length === 0 && (
									<span className="text-muted-foreground">Aucun groupe</span>
								)}
								{user.groups.map((group) => (
									<Badge key={group.id} variant="outline">
										{group.name}
									</Badge>
								))}
							</div>
						</Row>
					</dl>
				</CardContent>
				<CardFooter className="flex-wrap gap-2">
					<Button variant="outline" disabled>
						<Icon name="password" />
						Modifier mon mot de passe
					</Button>
					<Button variant="outline" disabled>
						<Icon name="groups" />
						Demander l'accès à un groupe
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
