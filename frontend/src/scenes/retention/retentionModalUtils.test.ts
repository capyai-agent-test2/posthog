import { ProcessedRetentionPayload } from 'scenes/retention/types'

import { selectRetentionModalRow } from './retentionModalUtils'

describe('selectRetentionModalRow', () => {
    const row = (label: string, breakdown_value?: string): ProcessedRetentionPayload =>
        ({
            label,
            breakdown_value,
            values: [{ count: 1 }],
        }) as ProcessedRetentionPayload

    it('selects the row within the clicked breakdown', () => {
        const rows = [row('Day 0', 'a'), row('Day 1', 'a'), row('Day 0', 'b'), row('Day 1', 'b')]

        expect(selectRetentionModalRow(rows, 1, 'b')).toBe(rows[3])
    })

    it('returns undefined for an out-of-range row instead of throwing', () => {
        expect(selectRetentionModalRow([row('Day 0')], 2, null)).toBeUndefined()
    })
})
