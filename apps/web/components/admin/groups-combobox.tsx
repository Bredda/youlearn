"use client";

import type { PublicGroup } from "@youlearn/types";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "@/components/ui/combobox";

/** Searchable multi-select of groups (scales to a long list, unlike a checkbox per group). */
export function GroupsCombobox({
	id,
	groups,
	value,
	onChange,
	onBlur,
	invalid,
}: {
	id?: string;
	groups: PublicGroup[];
	value: PublicGroup[];
	onChange: (value: PublicGroup[]) => void;
	onBlur?: () => void;
	invalid?: boolean;
}) {
	const anchor = useComboboxAnchor();

	return (
		<Combobox
			multiple
			items={groups}
			value={value}
			onValueChange={onChange}
			itemToStringLabel={(group) => group.name}
			isItemEqualToValue={(a, b) => a.id === b.id}
		>
			<ComboboxChips ref={anchor}>
				<ComboboxValue>
					{(selected: PublicGroup[]) => (
						<>
							{selected.map((group) => (
								<ComboboxChip key={group.id}>{group.name}</ComboboxChip>
							))}
							<ComboboxChipsInput
								id={id}
								aria-invalid={invalid}
								onBlur={onBlur}
								placeholder={
									selected.length === 0 ? "Rechercher un groupe…" : ""
								}
							/>
						</>
					)}
				</ComboboxValue>
			</ComboboxChips>
			<ComboboxContent anchor={anchor}>
				<ComboboxEmpty>Aucun groupe trouvé.</ComboboxEmpty>
				<ComboboxList>
					{(group: PublicGroup) => (
						<ComboboxItem key={group.id} value={group}>
							{group.name}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
