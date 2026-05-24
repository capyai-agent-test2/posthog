import { initKeaTests } from '~/test/init'
import { EntityTypes, FilterLogicalOperator, InsightType } from '~/types'

jest.mock('scenes/insights/filters/ActionFilter/ActionFilterRow/ActionFilterRow', () => ({
    MathAvailability: {
        None: 'none',
        All: 'all',
        FunnelsOnly: 'funnels_only',
        BoxPlotOnly: 'box_plot_only',
    },
}))

import { customerAnalyticsDashboardEventsLogic } from './customerAnalyticsDashboardEventsLogic'

describe('customerAnalyticsDashboardEventsLogic', () => {
    let logic: ReturnType<typeof customerAnalyticsDashboardEventsLogic.build>

    beforeEach(() => {
        initKeaTests()
        logic = customerAnalyticsDashboardEventsLogic()
        logic.mount()
    })

    afterEach(() => {
        logic.unmount()
    })

    it('preserves the trends insight when a selection is converted into a group', () => {
        logic.actions.setActivityEventSelection({
            groups: [
                {
                    id: null,
                    type: EntityTypes.GROUPS,
                    name: '$pageview',
                    order: 0,
                    operator: FilterLogicalOperator.Or,
                    nestedFilters: [
                        {
                            id: '$pageview',
                            type: EntityTypes.EVENTS,
                            name: '$pageview',
                            order: 0,
                        },
                    ],
                },
            ],
        })

        expect(logic.values.activityEventFilters).toMatchObject({
            insight: InsightType.TRENDS,
            groups: [
                expect.objectContaining({
                    type: EntityTypes.GROUPS,
                }),
            ],
        })
    })
})
