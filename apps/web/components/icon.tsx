import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";
import { Spinner } from "@/components/ui/spinner";
import { type IconName, icons } from "@/lib/icons";

/** An icon of the app, by name (see `lib/icons.ts`). Sized by its parent (buttons, menu items...). */
export function Icon({
	name,
	strokeWidth = 2,
	...props
}: { name: IconName } & Omit<ComponentProps<typeof HugeiconsIcon>, "icon">) {
	return (
		<HugeiconsIcon icon={icons[name]} strokeWidth={strokeWidth} {...props} />
	);
}

/** The icon of a button that starts an action: replaced by a spinner while the action runs. */
export function PendingIcon({
	pending,
	name,
}: {
	pending: boolean;
	name: IconName;
}) {
	return pending ? <Spinner /> : <Icon name={name} />;
}
