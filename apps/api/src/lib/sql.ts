/** Escapes LIKE wildcards so the search term is matched literally. */
export const escapeLike = (value: string) =>
	value.replace(/[\\%_]/g, (char) => `\\${char}`);
