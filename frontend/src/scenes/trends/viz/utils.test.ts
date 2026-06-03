import { getTrendResultLabel } from './utils'

describe('getTrendResultLabel', () => {
    it('formats null breakdown sentinels instead of showing the raw key', () => {
        expect(
            getTrendResultLabel(
                {
                    label: '$$_posthog_breakdown_null_$$',
                    breakdown_value: '$$_posthog_breakdown_null_$$',
                    filter: { breakdown: '$browser', breakdown_type: 'event' } as any,
                },
                [],
                undefined
            )
        ).toBe('None (i.e. no value)')
    })

    it('falls back to the series label when there is no breakdown value', () => {
        expect(
            getTrendResultLabel(
                {
                    label: '$pageview',
                    filter: undefined,
                },
                [],
                undefined
            )
        ).toBe('$pageview')
    })
})
