import '@testing-library/jest-dom'

import { cleanup, render } from '@testing-library/react'

import { teamLogic } from 'scenes/teamLogic'

import { NodeKind, TrendsQuery } from '~/queries/schema/schema-general'
import { initKeaTests } from '~/test/init'
import { TeamType } from '~/types'

import { InsightTestAccountFilter } from './InsightTestAccountFilter'

describe('InsightTestAccountFilter', () => {
    beforeEach(() => {
        initKeaTests()
        teamLogic.mount()
        teamLogic.actions.loadCurrentTeamSuccess({
            id: 1,
            test_account_filters: [{ key: 'email', value: '@posthog.com', operator: 'icontains', type: 'person' }],
        } as TeamType)
    })

    afterEach(() => {
        cleanup()
    })

    it('clears test account filtering when the filter is disabled by a data warehouse series', () => {
        const setQuery = jest.fn()
        const query: TrendsQuery = {
            kind: NodeKind.TrendsQuery,
            series: [{ kind: NodeKind.EventsNode, event: '$pageview' }],
            filterTestAccounts: true,
        }

        render(
            <InsightTestAccountFilter
                query={query}
                setQuery={setQuery}
                disabledReason="Filter groups cannot be added to insights with a data warehouse series."
            />
        )

        expect(setQuery).toHaveBeenCalledWith({
            ...query,
            filterTestAccounts: false,
        })
    })
})
