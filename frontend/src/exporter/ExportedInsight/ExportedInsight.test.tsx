import { render } from '@testing-library/react'

import { ExportedInsight } from '~/exporter/ExportedInsight/ExportedInsight'
import { initKeaTests } from '~/test/init'
import { ChartDisplayType, InsightModel } from '~/types'

const mockQuery = jest.fn(() => <div data-testid="mock-query" />)

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    BindLogic: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useMountedLogic: jest.fn(),
}))

jest.mock('scenes/dataThemeLogic', () => ({
    dataThemeLogic: () => ({}),
}))

jest.mock('scenes/insights/insightLogic', () => ({
    insightLogic: {},
}))

jest.mock('lib/components/Cards/InsightCard/TopHeading', () => ({
    TopHeading: () => <div>Top heading</div>,
}))

jest.mock('lib/components/InsightLegend/InsightLegend', () => ({
    InsightLegend: () => <div data-testid="mock-legend" />,
}))

jest.mock('scenes/insights/views/InsightsTable/InsightsTable', () => ({
    InsightsTable: () => <div data-testid="mock-insights-table" />,
}))

jest.mock('scenes/insights/views/BoxPlot/BoxPlotLegend', () => ({
    BoxPlotLegend: () => <div data-testid="mock-box-plot-legend" />,
}))

jest.mock('~/queries/nodes/InsightViz/utils', () => ({
    getQueryBasedInsightModel: (insight: InsightModel) => insight,
}))

jest.mock('~/queries/Query/Query', () => ({
    Query: (props: unknown) => {
        mockQuery(props)
        return <div data-testid="mock-query" />
    },
}))

describe('ExportedInsight', () => {
    beforeEach(() => {
        initKeaTests()
        mockQuery.mockClear()
    })

    function makeInsight(overrides: Partial<InsightModel> = {}): InsightModel {
        return {
            ...require('../../mocks/fixtures/api/projects/team_id/insights/trendsPie.json'),
            ...overrides,
            query: {
                ...require('../../mocks/fixtures/api/projects/team_id/insights/trendsPie.json').query,
                source: {
                    ...require('../../mocks/fixtures/api/projects/team_id/insights/trendsPie.json').query.source,
                    trendsFilter: {
                        ...require('../../mocks/fixtures/api/projects/team_id/insights/trendsPie.json').query.source
                            .trendsFilter,
                        display: ChartDisplayType.ActionsPie,
                        showLegend: true,
                    },
                },
            },
        } as InsightModel
    }

    it('moves exported trend legends outside the query renderer', () => {
        const { container } = render(
            <ExportedInsight
                insight={makeInsight()}
                themes={[]}
                exportOptions={{ legend: true, whitelabel: false, noHeader: false }}
            />
        )

        expect(container.querySelector('.ExportedInsight__content')?.className).toContain(
            'ExportedInsight__content--with-legend'
        )
        expect(mockQuery).toHaveBeenCalled()
        expect(mockQuery.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                query: expect.objectContaining({
                    source: expect.objectContaining({
                        trendsFilter: expect.objectContaining({
                            showLegend: false,
                        }),
                    }),
                }),
            })
        )
    })
})
