import '@testing-library/jest-dom'

import { cleanup, render, screen } from '@testing-library/react'

const mockUseValues = jest.fn()
const mockUseActions = jest.fn()
const mockUsePeriodicRerender = jest.fn()

jest.mock('kea', () => ({
    useValues: () => mockUseValues(),
    useActions: () => mockUseActions(),
}))

jest.mock('@posthog/icons', () => ({
    IconCheck: () => <span>check</span>,
    IconRefresh: () => <span>refresh</span>,
    IconSparkles: () => <span>sparkles</span>,
    IconX: () => <span>x</span>,
}))

jest.mock('@posthog/lemon-ui', () => ({
    LemonBadge: ({ visible, content }: any) => (visible ? <div>{content}</div> : null),
    LemonButton: ({ children, disabledReason, icon }: any) => (
        <button aria-disabled={disabledReason ? 'true' : 'false'}>
            {icon}
            {children}
        </button>
    ),
    LemonSwitch: () => null,
    Spinner: () => null,
    Tooltip: ({ children }: any) => <>{children}</>,
}))

jest.mock('lib/components/AppShortcuts/AppShortcut', () => ({
    AppShortcut: ({ children }: any) => <>{children}</>,
}))

jest.mock('lib/components/AppShortcuts/shortcuts', () => ({
    keyBinds: { refresh: 'r' },
}))

jest.mock('lib/components/TZLabel', () => ({
    TZLabel: () => <span>time</span>,
}))

jest.mock('lib/dayjs', () => {
    const actual = jest.requireActual('dayjs')
    actual.extend(jest.requireActual('dayjs/plugin/relativeTime'))

    const wrapped = (value?: unknown): ReturnType<typeof actual> => actual(value)
    Object.assign(wrapped, actual)

    return { dayjs: wrapped }
})

jest.mock('lib/hooks/useFeatureFlag', () => ({
    useFeatureFlag: () => false,
}))

jest.mock('lib/hooks/usePageVisibility', () => ({
    usePageVisibilityCb: jest.fn(),
}))

jest.mock('lib/hooks/usePeriodicRerender', () => ({
    usePeriodicRerender: (milliseconds: number) => mockUsePeriodicRerender(milliseconds),
}))

jest.mock('lib/lemon-ui/LemonMenu/LemonMenu', () => ({
    LemonMenuOverlay: () => null,
}))

jest.mock('lib/lemon-ui/LemonRadio', () => ({
    LemonRadio: () => null,
}))

jest.mock('lib/utils', () => ({
    humanFriendlyDuration: (seconds: number) => `${seconds}s`,
}))

jest.mock('lib/utils/css-classes', () => ({
    cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

jest.mock('scenes/dashboard/dashboardLogic', () => ({
    dashboardLogic: {},
}))

jest.mock('scenes/sceneTypes', () => ({
    Scene: { Dashboard: 'dashboard' },
}))

import { DashboardReloadAction } from './DashboardReloadAction'

describe('DashboardReloadAction', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUseActions.mockReturnValue({
            triggerDashboardRefresh: jest.fn(),
            setAutoRefresh: jest.fn(),
            setPageVisibility: jest.fn(),
            cancelDashboardRefresh: jest.fn(),
        })
    })

    afterEach(() => {
        cleanup()
    })

    it('rerenders every second while the refresh cooldown is active', () => {
        mockUseValues.mockReturnValue({
            itemsLoading: false,
            autoRefresh: { enabled: false, interval: 1800 },
            blockRefresh: true,
            nextAllowedDashboardRefresh: '2099-01-01T00:00:30Z',
            hasIntermittentFilters: false,
            hasUrlFilters: false,
            urlVariables: {},
            effectiveLastRefresh: null,
            refreshMetrics: { total: 0, completed: 0 },
            dashboardLoadData: null,
            isAnalyzing: false,
        })

        render(<DashboardReloadAction />)

        expect(mockUsePeriodicRerender).toHaveBeenCalledWith(1000)
        expect(screen.getByRole('button', { name: /refresh/i })).toHaveAttribute('aria-disabled', 'true')
    })

    it('falls back to a low-frequency rerender when no cooldown is active', () => {
        mockUseValues.mockReturnValue({
            itemsLoading: false,
            autoRefresh: { enabled: false, interval: 1800 },
            blockRefresh: false,
            nextAllowedDashboardRefresh: null,
            hasIntermittentFilters: false,
            hasUrlFilters: false,
            urlVariables: {},
            effectiveLastRefresh: null,
            refreshMetrics: { total: 0, completed: 0 },
            dashboardLoadData: null,
            isAnalyzing: false,
        })

        render(<DashboardReloadAction />)

        expect(mockUsePeriodicRerender).toHaveBeenCalledWith(60_000)
        expect(screen.getByRole('button', { name: /refresh/i })).toHaveAttribute('aria-disabled', 'false')
    })
})
