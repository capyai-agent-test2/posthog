import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import { BindLogic } from 'kea'
import { kea, path, reducers } from 'kea'

import { initKeaTests } from '~/test/init'
import { InsightShortId, ItemMode } from '~/types'

import { InsightSceneHeader } from './InsightSceneHeader'
import { insightSceneLogic } from './insightSceneLogic'

jest.mock('./InsightPageHeader', () => ({
    InsightPageHeader: () => <div>Mock insight page header</div>,
}))

jest.mock('./InsightNav/InsightsNav', () => ({
    InsightsNav: () => <div>Mock insights nav</div>,
}))

jest.mock('./insightDataLogic', () => {
    const mockInsightDataLogic = kea([
        path(['scenes', 'insights', 'tests', 'mockInsightDataLogic']),
        reducers({
            showDebugPanel: [false, {}],
        }),
    ])

    return {
        insightDataLogic: mockInsightDataLogic,
    }
})

jest.mock('./insightLogic', () => {
    const mockInsightLogic = kea([
        path(['scenes', 'insights', 'tests', 'mockInsightLogic']),
        reducers({
            insight: [{ short_id: 'abc123' }, {}],
        }),
    ])

    return {
        insightLogic: mockInsightLogic,
    }
})

describe('InsightSceneHeader', () => {
    const tabWithOverrides = 'tab-with-overrides'
    const cleanTab = 'clean-tab'
    const insightId = 'abc123' as InsightShortId

    beforeEach(() => {
        initKeaTests()
    })

    it('uses the rendered tab id instead of ambient scene binding for override banners', () => {
        const overriddenSceneLogic = insightSceneLogic({ tabId: tabWithOverrides })
        overriddenSceneLogic.mount()
        overriddenSceneLogic.actions.setSceneState(
            insightId,
            ItemMode.Edit,
            undefined,
            undefined,
            { date_from: '-7d' },
            undefined,
            undefined,
            undefined,
            undefined,
            null
        )

        const cleanSceneLogic = insightSceneLogic({ tabId: cleanTab })
        cleanSceneLogic.mount()
        cleanSceneLogic.actions.setSceneState(
            insightId,
            ItemMode.Edit,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            null
        )

        render(
            <BindLogic logic={insightSceneLogic} props={{ tabId: tabWithOverrides }}>
                <InsightSceneHeader
                    insightLogicProps={{ dashboardItemId: insightId, tabId: cleanTab, doNotLoad: true }}
                />
            </BindLogic>
        )

        expect(screen.queryByText(/filter\/variable overrides/i)).not.toBeInTheDocument()
    })
})
