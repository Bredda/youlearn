"use client";

import dynamic from "next/dynamic";
import { useCallback, useDeferredValue, useState } from "react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/writer/markdown";
import { uploadCourseImage } from "@/lib/upload-image";

// CodeMirror needs the DOM and is heavy: it only loads where an editor is shown.
const MarkdownEditor = dynamic(() => import("./markdown-editor"), {
	ssr: false,
	loading: () => <Skeleton className="h-40 w-full" />,
});

/**
 * A markdown source next to its live preview (tabs below `md`). When `original` is given, a switch compares the
 * source with it inline.
 */
export function MarkdownField({
	courseId,
	value,
	onChange,
	label,
	original,
	originalLabel,
}: {
	courseId: string;
	value: string;
	onChange: (value: string) => void;
	/** Accessible name of the editing area. */
	label: string;
	/** The same source in the base revision: enables the diff switch. */
	original?: string | undefined;
	/** Names the base revision in the switch label. */
	originalLabel?: string;
}) {
	const [tab, setTab] = useState<"edit" | "preview">("edit");
	const [diff, setDiff] = useState(false);
	// Typing stays instant: the preview catches up when the browser has time.
	const preview = useDeferredValue(value);
	const upload = useCallback(
		(file: File) => uploadCourseImage(courseId, file),
		[courseId],
	);
	const id = `diff-${label.replace(/\W+/g, "-")}`;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-3">
				<Tabs
					className="md:hidden"
					value={tab}
					onValueChange={(next) => setTab(next as "edit" | "preview")}
				>
					<TabsList>
						<TabsTrigger value="edit">Édition</TabsTrigger>
						<TabsTrigger value="preview">Aperçu</TabsTrigger>
					</TabsList>
				</Tabs>
				{original !== undefined && (
					<div className="ml-auto flex items-center gap-2">
						<Switch
							id={id}
							size="sm"
							checked={diff}
							onCheckedChange={setDiff}
						/>
						<Label htmlFor={id} className="text-xs">
							Différences{originalLabel ? ` avec ${originalLabel}` : ""}
						</Label>
					</div>
				)}
			</div>
			<div className="grid min-w-0 gap-3 md:grid-cols-2">
				<div className={tab === "edit" ? "min-w-0" : "hidden min-w-0 md:block"}>
					<MarkdownEditor
						value={value}
						onChange={onChange}
						label={label}
						uploadImage={upload}
						original={diff ? original : undefined}
					/>
				</div>
				<div
					className={
						tab === "preview"
							? "min-w-0 rounded-md border p-3"
							: "hidden min-w-0 rounded-md border p-3 md:block"
					}
				>
					{preview.trim() === "" ? (
						<p className="text-muted-foreground text-sm">
							L'aperçu s'affiche ici.
						</p>
					) : (
						<Markdown courseId={courseId}>{preview}</Markdown>
					)}
				</div>
			</div>
		</div>
	);
}
