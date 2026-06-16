import { initKeaTests } from '~/test/init'
import { InsightLogicProps } from '~/types'

import { breakdownTagLogic } from './breakdownTagLogic'
import { taxonomicBreakdownFilterLogic } from './taxonomicBreakdownFilterLogic'

const updateBreakdownFilter = jest.fn()
const updateDisplay = jest.fn()
const insightProps: InsightLogicProps = { dashboardItemId: 'new' }

describe('breakdownTagLogic', () => {
    beforeEach(() => {
        initKeaTests()
    })

    it.each([[false], [true]])(
        'initializes normalizeBreakdownURL from a persisted multiple breakdown value of %s',
        (normalize_url) => {
            const parentLogic = taxonomicBreakdownFilterLogic({
                insightProps,
                breakdownFilter: {
                    breakdowns: [{ property: '$pathname', type: 'event', normalize_url }],
                },
                isTrends: true,
                isFunnels: false,
                updateBreakdownFilter,
                updateDisplay,
            })
            parentLogic.mount()

            const logic = breakdownTagLogic({
                insightProps,
                breakdown: '$pathname',
                breakdownType: 'event',
                isTrends: true,
            })
            logic.mount()

            expect(logic.values.normalizeBreakdownURL).toBe(normalize_url)
        }
    )
})
