"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const ALL = "all";

/** A select filter where "all" means no filter. */
export function FilterSelect({
	label,
	value,
	options,
	onChange,
	className,
}: {
	label: string;
	value: string | undefined;
	options: { value: string; label: string }[];
	onChange: (value: string | undefined) => void;
	className?: string;
}) {
	const items = [{ value: ALL, label }, ...options];
	return (
		<Select
			value={value ?? ALL}
			onValueChange={(next) =>
				onChange(next === ALL ? undefined : (next ?? undefined))
			}
			items={items}
		>
			<SelectTrigger className={className} aria-label={label}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{items.map((item) => (
					<SelectItem key={item.value} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
