import { NodeKind } from '~/queries/schema/schema-general'
import type { ActionFilter, TrendResult } from '~/types'

import { worldMapSeriesToActorsQuery } from './worldMapActorsQuery'

describe('worldMapSeriesToActorsQuery', () => {
    const querySource = {
        kind: NodeKind.TrendsQuery,
        series: [{ kind: NodeKind.EventsNode, event: '$pageview' }],
        dateRange: { date_from: '-7d' },
    } as const

    it('scopes the persons modal query to the clicked country breakdown', () => {
        const action = { order: 2, math: 'total' } as ActionFilter
        const countrySeries = {
            action,
            label: 'Netherlands',
            aggregated_value: 12,
            count: 12,
            data: [12],
            days: [],
            labels: [],
            breakdown_value: 'NL',
        } as TrendResult

        expect(worldMapSeriesToActorsQuery(countrySeries, querySource)).toEqual({
            kind: NodeKind.InsightActorsQuery,
            source: querySource,
            day: undefined,
            status: undefined,
            series: 2,
            breakdown: 'NL',
            compare: undefined,
            includeRecordings: true,
        })
    })
})
