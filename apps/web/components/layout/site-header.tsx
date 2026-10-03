import Link from "next/link";
import { Icon } from "@/components/icon";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Sticky header spanning the full width, above the sidebar. Its height is the
 * `--header-height` variable set by the layout, which the sidebar uses to start below it.
 */
export function SiteHeader() {
	return (
		<header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
			<div className="flex h-(--header-height) w-full items-center gap-2 pr-4 pl-3">
				<SidebarTrigger />
				<Separator
					orientation="vertical"
					className="mr-2 data-vertical:h-4 data-vertical:self-auto"
				/>
				<Link href="/" className="flex items-center gap-2">
					<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<Icon name="brand" className="size-4" />
					</div>
					<span className="truncate font-medium text-sm">YouLearn</span>
				</Link>
			</div>
		</header>
	);
}
