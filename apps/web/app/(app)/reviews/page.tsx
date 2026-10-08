import type { MyReview } from "@youlearn/types";
import type { Metadata } from "next";
import { MyReviews } from "@/components/review/my-reviews";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Relectures" };

export default async function ReviewsPage() {
	const response = await apiFetch("/api/me/reviews");
	if (!response.ok) throw new Error("Impossible de charger vos relectures");
	const { reviews } = (await response.json()) as { reviews: MyReview[] };
	return <MyReviews reviews={reviews} />;
}
