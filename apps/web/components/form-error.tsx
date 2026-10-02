import { Alert01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Error returned by the server on submit (field validation errors go through `FieldError`). */
export function FormError({
	title = "Une erreur est survenue",
	children,
}: {
	title?: string;
	children: React.ReactNode;
}) {
	return (
		<Alert variant="destructive">
			<HugeiconsIcon icon={Alert01Icon} />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{children}</AlertDescription>
		</Alert>
	);
}
