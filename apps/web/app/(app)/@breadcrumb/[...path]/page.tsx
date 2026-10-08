import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { resolveBreadcrumb } from "@/lib/breadcrumbs-server";

/**
 * The breadcrumb slot of the site header (a parallel route of the `(app)` layout). It matches every path (the home
 * page has its own empty `page.tsx`), so it is rebuilt on each navigation, and the labels live in `lib/breadcrumbs.ts`: pages do not declare their own.
 */
export default async function BreadcrumbSlot(props: {
	params: Promise<{ path: string[] }>;
}) {
	const { path } = await props.params;
	// Next hands the segments encoded.
	return (
		<AppBreadcrumb
			crumbs={await resolveBreadcrumb(path.map(decodeURIComponent))}
		/>
	);
}
