import type { MyReview } from "@youlearn/types";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

/** The revisions a writer asked the user to proofread, with a way in. */
export function MyReviews({ reviews }: { reviews: MyReview[] }) {
	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title="Relectures"
				description="Les révisions de cours qu'on vous a demandé de relire."
			/>
			{reviews.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Aucune relecture en attente.
				</p>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{reviews.map((review) => (
						<li key={review.revisionId} className="grid">
							<Card>
								<CardHeader>
									<CardTitle className="line-clamp-2 text-base">
										{review.course.name}
									</CardTitle>
									<CardDescription>
										Révision {review.revisionKey} · modifiée le{" "}
										{dateFormat.format(new Date(review.updatedAt))}
									</CardDescription>
								</CardHeader>
								<CardContent className="flex flex-1 flex-col gap-3">
									<p className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">
										<span className="font-medium text-foreground">But : </span>
										{review.purpose}
									</p>
									<Button
										className="mt-auto self-start"
										nativeButton={false}
										render={<Link href={`/reviews/${review.revisionId}`} />}
									>
										<Icon name="preview" /> Relire
									</Button>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
