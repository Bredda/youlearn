import { Icon } from "@/components/icon";
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
			<Icon name="alert" />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{children}</AlertDescription>
		</Alert>
	);
}
