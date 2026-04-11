// Shared payload sanitizer
// - Removes undefined values recursively
// - Removes functions
// - Converts Infinity/-Infinity to null
// - Keeps Date instances
// - Keeps FieldValue-like instances (objects with _methodName property)

export function sanitizeForFirestore<T = any>(input: T): T | undefined {
	if (input === undefined) return undefined;

	// Filter out functions
	if (typeof input === 'function') return undefined as unknown as T;

	// Handle numbers with non-finite values
	if (typeof input === 'number') {
		if (!Number.isFinite(input)) return null as unknown as T;
		return input as unknown as T;
	}

	// Allow Date objects
	if (input instanceof Date) return input;

	// Allow FieldValue-like objects (objects with _methodName property)
	if (typeof input === 'object' && input !== null && '_methodName' in (input as any)) {
		return input;
	}

	// Arrays: sanitize items and drop undefined entries
	if (Array.isArray(input)) {
		const sanitizedArray = (input
			.map((item) => sanitizeForFirestore(item))
			.filter((item) => item !== undefined)) as unknown as T;
		return sanitizedArray;
	}

	// Objects: sanitize values recursively and drop undefined
	if (typeof input === 'object' && input !== null) {
		const entries = Object.entries(input as Record<string, unknown>)
			.map(([key, value]) => [key, sanitizeForFirestore(value)])
			.filter(([, value]) => value !== undefined) as [string, unknown][];
		return Object.fromEntries(entries) as T;
	}

	// Primitives (string, boolean, null)
	return input;
}

// Alias for generic usage
export const sanitizePayload = sanitizeForFirestore;

export function isEmptyObject(obj: unknown): boolean {
	return !!obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj as Record<string, unknown>).length === 0;
}
