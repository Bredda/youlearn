import { Separator } from "@/components/ui/separator";

/**
 * Heading of a page: title, optional description and, on the right, optional content (create / refresh buttons...),
 * followed by a separator so the page body starts clearly below it.
 */
export function PageHeader({
	title,
	description,
	children,
}: {
	title: string;
	description?: React.ReactNode;
	/** Actions or anything else to show next to the title. */
	children?: React.ReactNode;
}) {
	return (
		<header className="flex flex-col gap-4">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0 flex-1 basis-64">
					<h1 className="font-semibold text-xl">{title}</h1>
					{description && (
						<p className="text-muted-foreground text-sm">{description}</p>
					)}
				</div>
				{children && (
					<div className="flex shrink-0 items-center gap-2">{children}</div>
				)}
			</div>
			<Separator />
		</header>
	);
}
