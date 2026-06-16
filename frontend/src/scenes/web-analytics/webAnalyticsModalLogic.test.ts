import { expectLogic } from 'kea-test-utils'
import posthog from 'posthog-js'

import api from 'lib/api'

import { NodeKind } from '~/queries/schema/schema-general'
import { initKeaTests } from '~/test/init'

import { TileId } from './common'
import { pageReportsLogic } from './pageReportsLogic'
import { webAnalyticsLogic } from './webAnalyticsLogic'
import { webAnalyticsModalLogic } from './webAnalyticsModalLogic'

jest.mock('lib/api')
jest.mock('posthog-js')

describe('webAnalyticsModalLogic', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(api.query as jest.Mock).mockResolvedValue({ results: [] })
        ;(api.queryHogQL as jest.Mock).mockResolvedValue({ results: [] })
        ;(api.eventDefinitions.list as jest.Mock).mockResolvedValue({ results: [] })
        ;(api.propertyDefinitions.list as jest.Mock).mockResolvedValue({ results: [] })
        ;(api.hogFunctions.list as jest.Mock).mockResolvedValue({ results: [] })
        ;(posthog as unknown as { setPersonProperties: jest.Mock }).setPersonProperties = jest.fn()

        initKeaTests()
        webAnalyticsLogic.mount()
        pageReportsLogic.mount()
        webAnalyticsModalLogic.mount()
    })

    it('opens the page reports top events tile in the modal', async () => {
        pageReportsLogic.actions.setPageUrl('https://example.com/pricing')
        webAnalyticsModalLogic.actions.openModal(TileId.PAGE_REPORTS_TOP_EVENTS)

        await expectLogic(webAnalyticsModalLogic).toMatchValues({
            modal: expect.objectContaining({
                tileId: TileId.PAGE_REPORTS_TOP_EVENTS,
                title: 'Top Events',
                query: expect.objectContaining({
                    kind: NodeKind.InsightVizNode,
                }),
            }),
        })
    })

    it('opens the page reports combined metrics chart rather than its section', async () => {
        pageReportsLogic.actions.setPageUrl('https://example.com/pricing')
        webAnalyticsModalLogic.actions.openModal(TileId.PAGE_REPORTS_COMBINED_METRICS_CHART)

        await expectLogic(webAnalyticsModalLogic).toMatchValues({
            modal: expect.objectContaining({
                tileId: TileId.PAGE_REPORTS_COMBINED_METRICS_CHART,
                title: 'Trends over time',
                query: expect.objectContaining({
                    kind: NodeKind.InsightVizNode,
                }),
            }),
        })
    })
})
