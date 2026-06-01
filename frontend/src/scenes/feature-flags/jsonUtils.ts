export function featureFlagJsonStringify(value: unknown, space?: string | number): string {
    const result = JSON.stringify(
        value,
        (_, nestedValue) => (typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue),
        space
    )
    return result ?? String(value)
}
