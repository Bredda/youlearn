"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Icon } from "@/components/icon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IconName } from "@/lib/icons";

const TABS: {
	value: string;
	segment: string;
	label: string;
	icon: IconName;
	path: string;
}[] = [
	{
		value: "current",
		segment: "",
		label: "Révisions actuelles",
		icon: "draft",
		path: "",
	},
	{
		value: "learners",
		segment: "learners",
		label: "Apprenants",
		icon: "learners",
		path: "/learners",
	},
	{
		value: "history",
		segment: "history",
		label: "Anciennes révisions",
		icon: "history",
		path: "/history",
	},
];

/**
 * Navigation between the pages of a course. They are routes, not panels: each tab is a link and the tab bar
 * only reflects the page shown (the URL keeps the tab, and the data table of the learners keeps its own state).
 */
export function CourseTabs({ courseId }: { courseId: string }) {
	const segment = useSelectedLayoutSegment() ?? "";
	const active = TABS.find((tab) => tab.segment === segment) ?? TABS[0];

	return (
		<Tabs value={active?.value}>
			<TabsList variant="line" aria-label="Pages du cours">
				{TABS.map((tab) => (
					<TabsTrigger
						key={tab.value}
						value={tab.value}
						nativeButton={false}
						render={<Link href={`/writer/courses/${courseId}${tab.path}`} />}
					>
						<Icon name={tab.icon} />
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
