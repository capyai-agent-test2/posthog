import '@testing-library/jest-dom'

import { cleanup, render, screen } from '@testing-library/react'
import { useValues } from 'kea'

import { InsightScene } from './InsightScene'

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useValues: jest.fn(),
}))

jest.mock('kea-router', () => ({
    router: {
        actions: {
            push: jest.fn(),
        },
    },
}))

jest.mock('scenes/insights/insightSceneLogic', () => ({
    insightSceneLogic: jest.fn((props: { tabId?: string }) => ({ __mock: 'insightSceneLogic', props })),
}))

jest.mock('scenes/insights/InsightAsScene', () => ({
    InsightAsScene: ({ insightId }: { insightId: string }): JSX.Element => (
        <div data-attr="insight-as-scene">{insightId}</div>
    ),
}))

jest.mock('scenes/insights/InsightSkeleton', () => ({
    InsightSkeleton: (): JSX.Element => <div data-attr="insight-skeleton" />,
}))

jest.mock('lib/components/NotFound', () => ({
    NotFound: ({ object }: { object: string }): JSX.Element => <div data-attr="not-found">{object}</div>,
}))

const mockedUseValues = useValues as jest.Mock

describe('InsightScene', () => {
    beforeEach(() => {
        mockedUseValues.mockReset()
        cleanup()
    })

    it('renders the insight scene when the loaded insight matches the URL', () => {
        mockedUseValues.mockReturnValue({
            insightId: 'abc123',
            insight: { id: 1, short_id: 'abc123', query: { kind: 'TrendsQuery' } },
            insightLogicRef: null,
            insightMode: 'view',
            dashboardId: null,
        })

        render(<InsightScene tabId="tab-1" />)

        expect(screen.getByTestId('insight-as-scene')).toHaveTextContent('abc123')
        expect(screen.queryByTestId('insight-skeleton')).not.toBeInTheDocument()
    })

    it('shows the loading skeleton instead of a stale insight from the previous URL', () => {
        mockedUseValues.mockReturnValue({
            insightId: 'next123',
            insight: { id: 1, short_id: 'prev123', query: { kind: 'TrendsQuery' } },
            insightLogicRef: { logic: { values: { insightLoading: true } } },
            insightMode: 'view',
            dashboardId: null,
        })

        render(<InsightScene tabId="tab-1" />)

        expect(screen.getByTestId('insight-skeleton')).toBeInTheDocument()
        expect(screen.queryByTestId('insight-as-scene')).not.toBeInTheDocument()
    })
})
