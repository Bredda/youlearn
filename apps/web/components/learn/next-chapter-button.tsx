"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useReadingReached } from "@/components/learn/reading-gate";
import { Button } from "@/components/ui/button";

/** Link to the next chapter: disabled while it is locked, or until the current content has been read. */
export function NextChapterButton({
	href,
	locked,
}: {
	href: string;
	locked: boolean;
}) {
	const reached = useReadingReached();
	if (locked)
		return (
			<Button variant="outline" disabled>
				<Icon name="locked" /> Suivant
			</Button>
		);
	if (!reached)
		return (
			<Button disabled title="Lisez le chapitre jusqu'en bas pour continuer">
				Suivant <Icon name="nextPage" />
			</Button>
		);
	return (
		<Button nativeButton={false} render={<Link href={href} />}>
			Suivant <Icon name="nextPage" />
		</Button>
	);
}
