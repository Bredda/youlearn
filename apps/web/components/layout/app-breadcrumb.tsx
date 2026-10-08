import Link from "next/link";
import { Fragment } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Crumb } from "@/lib/breadcrumbs";

/**
 * Where the user is, in the site header. A step without a link is plain text (the area, and the current page).
 * On narrow screens only the last step shows, so the header never wraps.
 */
export function AppBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
	if (crumbs.length === 0) return null;
	return (
		<Breadcrumb className="min-w-0">
			<BreadcrumbList className="flex-nowrap">
				{crumbs.map((crumb, index) => {
					const last = index === crumbs.length - 1;
					return (
						<Fragment key={crumb.href ?? crumb.label}>
							{index > 0 && <BreadcrumbSeparator className="max-md:hidden" />}
							<BreadcrumbItem
								className={`min-w-0 ${last ? "" : "max-md:hidden"}`}
							>
								{last ? (
									<BreadcrumbPage className="block max-w-64 truncate">
										{crumb.label}
									</BreadcrumbPage>
								) : crumb.href ? (
									<BreadcrumbLink
										className="block max-w-48 truncate"
										render={<Link href={crumb.href} />}
									>
										{crumb.label}
									</BreadcrumbLink>
								) : (
									<span className="block max-w-48 truncate">{crumb.label}</span>
								)}
							</BreadcrumbItem>
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
