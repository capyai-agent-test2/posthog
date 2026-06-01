import { ProcessedRetentionPayload } from 'scenes/retention/types'

export function selectRetentionModalRow(
    results: ProcessedRetentionPayload[],
    selectedInterval: number,
    selectedBreakdownValue: string | number | null
): ProcessedRetentionPayload | undefined {
    if (selectedBreakdownValue !== null) {
        return (
            results.filter((result) => result.breakdown_value === selectedBreakdownValue)[selectedInterval] ||
            results[selectedInterval]
        )
    }

    return results[selectedInterval]
}
