"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";

type HandleRef = (element: Element | null) => void;

/** The grip an item is dragged by (also reachable by keyboard: focus it, Space, arrows, Space). */
export function DragHandle({
	handleRef,
	label,
}: {
	handleRef: HandleRef;
	label: string;
}) {
	return (
		<button
			type="button"
			ref={handleRef}
			aria-label={label}
			title={label}
			className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
		>
			<Icon name="dragHandle" className="size-4" />
		</button>
	);
}

function SortableItem({
	id,
	index,
	disabled,
	children,
}: {
	id: string;
	index: number;
	disabled: boolean;
	children: (handleRef: HandleRef) => ReactNode;
}) {
	const { ref, handleRef, isDragging } = useSortable({ id, index, disabled });
	return (
		<div ref={ref} className={isDragging ? "opacity-60" : undefined}>
			{children(handleRef)}
		</div>
	);
}

/** A vertical list the user can reorder by dragging; `onMove` receives the old and the new index. */
export function SortableList<T extends { id: string }>({
	items,
	onMove,
	disabled = false,
	className,
	children,
}: {
	items: T[];
	onMove: (from: number, to: number) => void;
	disabled?: boolean;
	className?: string;
	children: (item: T, index: number, handleRef: HandleRef) => ReactNode;
}) {
	return (
		<DragDropProvider
			onDragEnd={(event) => {
				if (event.canceled) return;
				const { source } = event.operation;
				if (isSortable(source) && source.initialIndex !== source.index) {
					onMove(source.initialIndex, source.index);
				}
			}}
		>
			<div className={className}>
				{items.map((item, index) => (
					<SortableItem
						key={item.id}
						id={item.id}
						index={index}
						disabled={disabled}
					>
						{(handleRef) => children(item, index, handleRef)}
					</SortableItem>
				))}
			</div>
		</DragDropProvider>
	);
}
