import { render } from '@testing-library/react'
import type React from 'react'

import { Query } from '~/queries/Query/Query'
import { NodeKind } from '~/queries/schema/schema-general'
import { DashboardPlacement, QueryBasedInsightModel } from '~/types'

import { InsightCard } from './InsightCard'

jest.mock('kea', () => ({
    BindLogic: ({ children }: { children: React.ReactNode }) => children,
    useValues: jest.fn((logic: { values?: Record<string, unknown> }) => logic.values ?? {}),
}))

jest.mock('lib/logic/featureFlagLogic', () => ({
    featureFlagLogic: { values: { featureFlags: {} } },
}))

jest.mock('~/layout/navigation-3000/themeLogic', () => ({
    themeLogic: { values: { theme: null } },
}))

jest.mock('~/layout/ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('react-intersection-observer', () => ({
    useInView: jest.fn(() => ({ ref: jest.fn(), inView: true })),
}))

jest.mock('scenes/insights/insightLogic', () => ({
    insightLogic: jest.fn(() => ({ values: { insightLoading: false } })),
}))

jest.mock('scenes/insights/insightDataLogic', () => ({
    insightDataLogic: jest.fn(() => ({ values: { insightDataLoading: false } })),
}))

jest.mock('~/queries/nodes/InsightViz/utils', () => ({
    extractValidationError: jest.fn(() => null),
}))

jest.mock('scenes/insights/EmptyStates', () => ({
    InsightErrorState: jest.fn(() => null),
    InsightLoadingState: jest.fn(() => null),
    InsightTimeoutState: jest.fn(() => null),
    InsightValidationError: jest.fn(() => null),
}))

jest.mock('~/queries/Query/Query', () => ({
    Query: jest.fn(() => null),
}))

jest.mock('./InsightMeta', () => ({
    InsightMeta: jest.fn(() => null),
}))

describe('InsightCard', () => {
    beforeEach(() => {
        jest.mocked(Query).mockClear()
    })

    it('passes dashboard filter overrides to the rendered query and insight context', () => {
        const filtersOverride = { date_from: '-7d' }
        const variablesOverride = { dateRange: { code_name: 'dateRange', value: '-7d' } }
        const insight = {
            id: 1,
            short_id: 'abc123',
            query: {
                kind: NodeKind.InsightVizNode,
                source: {
                    kind: NodeKind.TrendsQuery,
                    series: [{ kind: NodeKind.EventsNode, event: '$pageview' }],
                },
            },
            result: [{ count: 1 }],
        } as QueryBasedInsightModel

        render(
            <InsightCard
                insight={insight}
                dashboardId={12}
                placement={DashboardPlacement.Dashboard}
                filtersOverride={filtersOverride}
                variablesOverride={variablesOverride}
            />
        )

        expect(Query).toHaveBeenCalledWith(
            expect.objectContaining({
                filtersOverride,
                variablesOverride,
                context: expect.objectContaining({
                    insightProps: expect.objectContaining({
                        filtersOverride,
                        variablesOverride,
                    }),
                }),
            }),
            expect.anything()
        )
    })
})
