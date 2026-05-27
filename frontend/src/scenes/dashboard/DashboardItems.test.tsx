import '@testing-library/jest-dom'

import { cleanup, render } from '@testing-library/react'
import { useActions, useValues } from 'kea'
import { router } from 'kea-router'
import type React from 'react'

import { eventUsageLogic } from 'lib/utils/eventUsageLogic'
import { dashboardLogic } from 'scenes/dashboard/dashboardLogic'

import { dashboardsModel } from '~/models/dashboardsModel'
import { insightsModel } from '~/models/insightsModel'
import { DashboardMode, DashboardPlacement } from '~/types'

import { DashboardItems } from './DashboardItems'

jest.mock(
    '@posthog/quill',
    () =>
        new Proxy(
            {},
            {
                get: (_, key) => {
                    if (key === '__esModule') {
                        return true
                    }

                    return ({ children }: { children?: React.ReactNode }) => <>{children}</>
                },
            }
        ),
    { virtual: true }
)

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useValues: jest.fn(),
    useActions: jest.fn(),
}))

jest.mock('scenes/dashboard/dashboardLogic', () => ({
    dashboardLogic: { __mock: 'dashboardLogic' },
}))

jest.mock('~/models/dashboardsModel', () => ({
    dashboardsModel: { __mock: 'dashboardsModel' },
}))

jest.mock('~/models/insightsModel', () => ({
    insightsModel: { __mock: 'insightsModel' },
}))

jest.mock('lib/utils/eventUsageLogic', () => ({
    eventUsageLogic: { __mock: 'eventUsageLogic' },
    DashboardEventSource: {
        CardEdgeHover: 'CardEdgeHover',
        CardDragHandle: 'CardDragHandle',
    },
}))

jest.mock('kea-router', () => ({
    ...jest.requireActual('kea-router'),
    router: { __mock: 'router' },
}))

jest.mock('lib/hooks/useResizeObserver', () => ({
    useResizeObserver: () => ({ width: 1200, ref: { current: null } }),
}))

jest.mock('lib/hooks/useFeatureFlag', () => ({
    useFeatureFlag: () => true,
}))

jest.mock('scenes/surveys/hooks/useSurveyLinkedInsights', () => ({
    useSurveyLinkedInsights: () => ({ data: [], loading: false }),
}))

jest.mock('scenes/surveys/utils/opportunityDetection', () => ({
    getBestSurveyOpportunityFunnel: () => null,
}))

jest.mock('~/exporter/exporterViewLogic', () => ({
    getCurrentExporterData: () => null,
}))

jest.mock('scenes/urls', () => ({
    ...jest.requireActual('scenes/urls'),
    urls: {
        ...jest.requireActual('scenes/urls').urls,
        dashboardTextTile: () => '/dashboard/5/text/1',
    },
}))

jest.mock('lib/components/Cards/InsightCard', () => ({
    InsightCard: ({
        tile,
        showResizeHandles,
        apiErrored,
        apiError,
    }: {
        tile: { id: number }
        showResizeHandles: boolean
        apiErrored?: boolean
        apiError?: { detail?: string | null }
    }) => (
        <div
            data-attr={`insight-card-${tile.id}`}
            data-tile-id={String(tile.id)}
            data-show-resize-handles={String(showResizeHandles)}
            data-api-errored={String(apiErrored)}
            data-api-error-detail={apiError?.detail || ''}
        />
    ),
}))

jest.mock('./items/DashboardTextItem', () => ({
    DashboardTextItem: ({ tile, showResizeHandles }: { tile: { id: number }; showResizeHandles: boolean }) => (
        <div
            data-attr="text-card"
            data-tile-id={String(tile.id)}
            data-show-resize-handles={String(showResizeHandles)}
        />
    ),
}))

jest.mock('react-grid-layout', () => {
    return {
        useContainerWidth: () => ({
            width: 1200,
            containerRef: { current: null },
            mounted: true,
        }),
        Responsive: ({
            className,
            rowHeight,
            margin,
            resizeConfig,
            dragConfig,
            children,
        }: {
            className: string
            rowHeight: number
            margin: [number, number]
            resizeConfig: { enabled: boolean }
            dragConfig: { enabled: boolean }
            children: any
        }) => (
            <div
                data-attr="react-grid-layout"
                data-class-name={className}
                data-row-height={String(rowHeight)}
                data-margin={margin.join(',')}
                data-resize-enabled={String(resizeConfig.enabled)}
                data-drag-enabled={String(dragConfig.enabled)}
            >
                {children}
            </div>
        ),
    }
})

jest.mock('react-grid-layout/extras', () => ({
    GridBackground: ({ rowHeight, margin }: { rowHeight: number; margin: [number, number] }) => (
        <div data-attr="grid-background" data-row-height={String(rowHeight)} data-margin={margin.join(',')} />
    ),
}))

const mockedUseValues = useValues as jest.Mock
const mockedUseActions = useActions as jest.Mock

describe('DashboardItems', () => {
    afterEach(() => {
        cleanup()
    })

    beforeEach(() => {
        jest.clearAllMocks()

        mockedUseValues.mockImplementation((logic) => {
            if (logic === dashboardLogic) {
                return {
                    dashboard: { id: 5 },
                    tiles: [
                        {
                            id: 1,
                            insight: { id: 101, short_id: 'abc123', query: { kind: 'InsightVizNode' } },
                        },
                    ],
                    layouts: {
                        sm: [{ i: '1', x: 0, y: 0, w: 6, h: 5 }],
                    },
                    dashboardMode: DashboardMode.Edit,
                    placement: DashboardPlacement.Dashboard,
                    isRefreshingQueued: () => false,
                    isRefreshing: () => false,
                    highlightedInsightId: null,
                    refreshStatus: {},
                    itemsLoading: false,
                    dashboardStreaming: false,
                    effectiveEditBarFilters: {},
                    effectiveDashboardVariableOverrides: {},
                    temporaryBreakdownColors: [],
                    dataColorThemeId: null,
                    canEditDashboard: true,
                    layoutZoom: 0.75,
                }
            }

            if (logic === dashboardsModel) {
                return {
                    nameSortedDashboards: [{ id: 6, name: 'Other dashboard' }],
                }
            }

            return {}
        })

        mockedUseActions.mockImplementation((logic) => {
            if (logic === dashboardLogic) {
                return {
                    updateLayouts: jest.fn(),
                    updateContainerWidth: jest.fn(),
                    updateTileColor: jest.fn(),
                    toggleTileDescription: jest.fn(),
                    removeTile: jest.fn(),
                    duplicateTile: jest.fn(),
                    refreshDashboardItem: jest.fn(),
                    moveToDashboard: jest.fn(),
                    copyToDashboard: jest.fn(),
                    setTileOverride: jest.fn(),
                    setDashboardMode: jest.fn(),
                }
            }

            if (logic === insightsModel) {
                return {
                    renameInsight: jest.fn(),
                }
            }

            if (logic === eventUsageLogic) {
                return {
                    reportDashboardTileRepositioned: jest.fn(),
                }
            }

            if (logic === router) {
                return {
                    push: jest.fn(),
                }
            }

            return {}
        })
    })

    it('matches snapshot in edit mode with layout zoom enabled', () => {
        const { container } = render(<DashboardItems />)
        expect(container.firstChild).toMatchInlineSnapshot(`
            <div
              class="dashboard-items-wrapper"
            >
              <div
                class="relative"
              >
                <div
                  data-attr="grid-background"
                  data-margin="14.4,14.4"
                  data-row-height="60"
                />
                <div
                  data-attr="react-grid-layout"
                  data-class-name="dashboard-edit-mode"
                  data-drag-enabled="true"
                  data-margin="14.4,14.4"
                  data-resize-enabled="false"
                  data-row-height="60"
                >
                  <div
                    data-api-error-detail=""
                    data-api-errored="false"
                    data-attr="insight-card-1"
                    data-show-resize-handles="false"
                    data-tile-id="1"
                  />
                </div>
              </div>
            </div>
        `)
    })

    it('passes cached query status errors through to the insight card', () => {
        mockedUseValues.mockImplementation((logic) => {
            if (logic === dashboardLogic) {
                return {
                    dashboard: { id: 5 },
                    tiles: [
                        {
                            id: 1,
                            insight: {
                                id: 101,
                                short_id: 'abc123',
                                query: { kind: 'InsightVizNode' },
                                query_status: { error_message: 'Column does not exist' },
                            },
                        },
                    ],
                    layouts: {
                        sm: [{ i: '1', x: 0, y: 0, w: 6, h: 5 }],
                    },
                    dashboardMode: DashboardMode.Edit,
                    placement: DashboardPlacement.Dashboard,
                    isRefreshingQueued: () => false,
                    isRefreshing: () => false,
                    highlightedInsightId: null,
                    refreshStatus: {},
                    itemsLoading: false,
                    dashboardStreaming: false,
                    effectiveEditBarFilters: {},
                    effectiveDashboardVariableOverrides: {},
                    temporaryBreakdownColors: [],
                    dataColorThemeId: null,
                    canEditDashboard: true,
                    layoutZoom: 0.75,
                }
            }

            if (logic === dashboardsModel) {
                return {
                    nameSortedDashboards: [{ id: 6, name: 'Other dashboard' }],
                }
            }

            return {}
        })

        const { getByTestId } = render(<DashboardItems />)
        const card = getByTestId('insight-card-1')

        expect(card).toHaveAttribute('data-api-errored', 'true')
        expect(card).toHaveAttribute('data-api-error-detail', 'Column does not exist')
    })
})
