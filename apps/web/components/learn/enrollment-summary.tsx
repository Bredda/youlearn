import type { LearnerEnrollment } from "@youlearn/types";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });
const formatDate = (iso: string) => dateFormat.format(new Date(iso));

/**
 * What a finished enrollment amounts to: outcome, dates, revision followed and, for a certifying course, the score
 * of the final exam. Shared by the completion dialog and the course sheet; the certificate will join it later.
 */
export function EnrollmentSummary({
	enrollment,
	certifying,
}: {
	enrollment: LearnerEnrollment;
	certifying: boolean;
}) {
	const failed = enrollment.status === "failed";
	const rows: { label: string; value: React.ReactNode }[] = [
		{
			label: "Résultat",
			value: failed ? (
				<Badge variant="destructive">
					<Icon name="alert" /> Échec à l'examen final
				</Badge>
			) : (
				<Badge>
					<Icon name="done" /> {certifying ? "Réussi" : "Terminé"}
				</Badge>
			),
		},
		{ label: "Commencé le", value: formatDate(enrollment.startedAt) },
	];
	if (enrollment.finishedAt)
		rows.push({
			label: failed ? "Échoué le" : "Terminé le",
			value: formatDate(enrollment.finishedAt),
		});
	if (certifying && enrollment.finalExamScore !== null)
		rows.push({
			label: "Score à l'examen final",
			value: `${enrollment.finalExamScore} %`,
		});
	rows.push({ label: "Révision suivie", value: enrollment.revisionKey });

	return (
		<dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
			{rows.map(({ label, value }) => (
				<div key={label} className="contents">
					<dt className="text-muted-foreground">{label}</dt>
					<dd className="font-medium">{value}</dd>
				</div>
			))}
		</dl>
	);
}
