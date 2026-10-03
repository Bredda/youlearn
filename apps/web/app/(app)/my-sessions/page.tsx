import type { MyEnrollment } from "@youlearn/types";
import type { Metadata } from "next";
import { MySessions } from "@/components/learn/my-sessions";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Mes sessions" };

export default async function MySessionsPage() {
	const response = await apiFetch("/api/me/enrollments");
	if (!response.ok) throw new Error("Impossible de charger vos sessions");
	const { enrollments } = (await response.json()) as {
		enrollments: MyEnrollment[];
	};
	return <MySessions enrollments={enrollments} />;
}
