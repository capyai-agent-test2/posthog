import '@testing-library/jest-dom'

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'kea'

import { insightDataLogic } from 'scenes/insights/insightDataLogic'
import { insightLogic } from 'scenes/insights/insightLogic'
import { insightVizDataLogic } from 'scenes/insights/insightVizDataLogic'

import { useMocks } from '~/mocks/jest'
import { LifecycleQuery, NodeKind } from '~/queries/schema/schema-general'
import { initKeaTests } from '~/test/init'
import { InsightShortId } from '~/types'

import { LifecycleToggles } from './LifecycleToggles'

jest.mock(
    '@posthog/quill',
    () => {
        const Component = ({ children }: { children?: React.ReactNode }): JSX.Element => <>{children}</>
        return {
            __esModule: true,
            Button: Component,
            ButtonGroup: Component,
            DropdownMenu: Component,
            DropdownMenuContent: Component,
            DropdownMenuGroup: Component,
            DropdownMenuItem: Component,
            DropdownMenuLabel: Component,
            DropdownMenuSeparator: Component,
            DropdownMenuTrigger: Component,
            InputGroup: Component,
            InputGroupInput: Component,
            Popover: Component,
            PopoverContent: Component,
            PopoverTrigger: Component,
            ScrollArea: Component,
            Tooltip: Component,
            TooltipContent: Component,
            TooltipTrigger: Component,
            cn: (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' '),
        }
    },
    { virtual: true }
)

const Insight123 = '123' as InsightShortId
const insightProps = { dashboardItemId: Insight123 }

function makeLifecycleQuery(): LifecycleQuery {
    return {
        kind: NodeKind.LifecycleQuery,
        series: [{ kind: NodeKind.EventsNode, name: '$pageview', event: '$pageview' }],
    }
}

describe('LifecycleToggles', () => {
    beforeEach(() => {
        useMocks({
            get: {
                '/api/environments/:team_id/insights/trend': [],
                '/api/environments/:team_id/insights/': { results: [{}] },
                '/api/users/@me': {},
                '/api/environments/:team_id/groups_types/': [],
            },
        })
        initKeaTests()
    })

    afterEach(() => {
        cleanup()
    })

    it('preserves consecutive lifecycle toggle changes before the debounced query update flushes', async () => {
        insightLogic(insightProps).mount()
        insightDataLogic(insightProps).mount()
        const vizDataLogic = insightVizDataLogic(insightProps)
        vizDataLogic.mount()
        vizDataLogic.actions.updateQuerySource(makeLifecycleQuery())

        render(
            <Provider>
                <LifecycleToggles insightProps={insightProps} />
            </Provider>
        )

        const newCheckbox = screen.getByRole('checkbox', { name: 'new' })
        const returningCheckbox = screen.getByRole('checkbox', { name: 'returning' })

        expect(newCheckbox).toBeChecked()
        expect(returningCheckbox).toBeChecked()

        await userEvent.click(newCheckbox)
        await userEvent.click(returningCheckbox)

        expect(newCheckbox).not.toBeChecked()
        expect(returningCheckbox).not.toBeChecked()

        await waitFor(() => {
            expect(vizDataLogic.values.lifecycleFilter?.toggledLifecycles).toEqual(['resurrecting', 'dormant'])
        })
    })
})
