import '@testing-library/jest-dom'

import { render } from '@testing-library/react'
import { useActions, useValues } from 'kea'
import React from 'react'

import { RegionMap } from './RegionMap'

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useActions: jest.fn(),
    useValues: jest.fn(),
}))

jest.mock('~/models/groupsModel', () => ({
    groupsModel: Symbol('groupsModel'),
}))

jest.mock('~/scenes/teamLogic', () => ({
    teamLogic: Symbol('teamLogic'),
}))

jest.mock('../../insightLogic', () => ({
    insightLogic: Symbol('insightLogic'),
}))

jest.mock('./regionMapLogic', () => ({
    regionMapLogic: jest.fn(() => Symbol('regionMapLogic')),
}))

jest.mock('react-simple-maps', () => ({
    ComposableMap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Geographies: ({ children }: { children: (args: { geographies: any[] }) => React.ReactNode }) => (
        <div>{children({ geographies: [] })}</div>
    ),
    Geography: () => <div />,
}))

jest.mock('scenes/trends/persons-modal/PersonsModal', () => ({
    openPersonsModal: jest.fn(),
}))

jest.mock('scenes/insights/InsightTooltip/InsightTooltip', () => ({
    InsightTooltip: () => <div />,
}))

jest.mock('scenes/insights/useInsightTooltip', () => ({
    useInsightTooltip: () => ({
        getTooltip: () => [{ render: jest.fn() }],
        showTooltip: jest.fn(),
        hideTooltip: jest.fn(),
        positionTooltipAt: jest.fn(),
        resetTooltipPosition: jest.fn(),
        measureTooltip: jest.fn(),
    }),
}))

const { groupsModel } = jest.requireMock('~/models/groupsModel') as { groupsModel: symbol }
const { teamLogic } = jest.requireMock('~/scenes/teamLogic') as { teamLogic: symbol }
const { insightLogic } = jest.requireMock('../../insightLogic') as { insightLogic: symbol }
const { regionMapLogic } = jest.requireMock('./regionMapLogic') as { regionMapLogic: jest.Mock }

describe('RegionMap', () => {
    it('renders without crashing when the query has no series', () => {
        const mockedRegionMapLogic = Symbol('mockedRegionMapLogic')
        regionMapLogic.mockReturnValue(mockedRegionMapLogic)

        ;(useValues as jest.Mock).mockImplementation((logic) => {
            if (logic === insightLogic) {
                return { insightProps: { dashboardItemId: 'new' } }
            }

            if (logic === groupsModel) {
                return { aggregationLabel: () => ({ plural: 'users' }) }
            }

            if (logic === teamLogic) {
                return { baseCurrency: 'USD' }
            }

            return {
                series: [],
                trendsFilter: null,
                breakdownFilter: null,
                isTooltipShown: false,
                currentTooltip: null,
                tooltipCoordinates: null,
                subdivisionCodeToSeries: {},
                maxAggregatedValue: 0,
                querySource: null,
                theme: { 'preset-1': '#000000' },
            }
        })

        ;(useActions as jest.Mock).mockReturnValue({
            showTooltip: jest.fn(),
            hideTooltip: jest.fn(),
            updateTooltipCoordinates: jest.fn(),
        })

        expect(() => render(<RegionMap />)).not.toThrow()
    })
})
