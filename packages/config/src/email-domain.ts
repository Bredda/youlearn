// Pure helpers (no env access) so they can also be imported from client code.

/** "Jane@Acme.com" -> "acme.com" */
export function emailDomain(email: string): string {
	return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

/** An empty list means "no restriction". */
export function isEmailDomainAllowed(
	email: string,
	allowedDomains: readonly string[],
): boolean {
	return (
		allowedDomains.length === 0 || allowedDomains.includes(emailDomain(email))
	);
}
