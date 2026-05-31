import { retentionToActorsQuery } from 'scenes/retention/queries'

import { NodeKind, type RetentionQuery } from '~/queries/schema/schema-general'

function makeRetentionQuery(overrides: Partial<RetentionQuery> = {}): RetentionQuery {
    return {
        kind: NodeKind.RetentionQuery,
        retentionFilter: {
            period: 'Day',
            totalIntervals: 7,
        },
        ...overrides,
    } as RetentionQuery
}

describe('retentionToActorsQuery', () => {
    it('selects persons for person retention queries', () => {
        const actorsQuery = retentionToActorsQuery(makeRetentionQuery(), 1)

        expect(actorsQuery.select?.[0]).toBe('person')
    })

    it('selects actor for group retention queries', () => {
        const actorsQuery = retentionToActorsQuery(makeRetentionQuery({ aggregation_group_type_index: 0 }), 1)

        expect(actorsQuery.select?.[0]).toBe('actor')
        expect(actorsQuery.source?.source).toMatchObject({
            aggregation_group_type_index: 0,
        })
    })
})
