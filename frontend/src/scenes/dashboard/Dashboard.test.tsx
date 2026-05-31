import '@testing-library/jest-dom'

import { cleanup, render } from '@testing-library/react'

import { DashboardEventSource } from 'lib/utils/eventUsageLogic'

import { useMocks } from '~/mocks/jest'
import { initKeaTests } from '~/test/init'
import { AccessControlLevel, DashboardMode, DashboardPlacement, DashboardType, QueryBasedInsightModel } from '~/types'

import { Dashboard } from './Dashboard'
import { dashboardLogic } from './dashboardLogic'

jest.mock('lib/hooks/useFileSystemLogView', () => ({
    useFileSystemLogView: jest.fn(),
}))

jest.mock('./DashboardFilters', () => ({
    DashboardFilterBar: () => <div data-attr="dashboard-filter-bar" />,
}))

jest.mock('./DashboardItems', () => ({
    DashboardItems: () => <div data-attr="dashboard-items" />,
}))

jest.mock('./DashboardOverridesBanner', () => ({
    DashboardOverridesBanner: () => null,
}))

jest.mock('./DashboardPublicAccessBanner', () => ({
    DashboardPublicAccessBanner: () => null,
}))

jest.mock('./DashboardZoomControl', () => ({
    DashboardZoomControl: () => <div data-attr="dashboard-zoom-control" />,
}))

const MOCK_DASHBOARD: DashboardType<QueryBasedInsightModel> = {
    id: 5,
    name: 'Test Dashboard',
    description: 'A test dashboard',
    pinned: false,
    tiles: [{ id: 1, layouts: {}, insight: { id: 101, short_id: 'abc123' } } as any],
    tags: [],
    created_at: '2020-01-01T00:00:00Z',
    created_by: {
        id: 1,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@posthog.com',
        uuid: 'abc',
        distinct_id: 'test-distinct-id',
    },
    last_accessed_at: '2020-01-01T00:00:00Z',
    is_shared: false,
    deleted: false,
    creation_mode: 'default',
    user_access_level: AccessControlLevel.Editor,
    filters: {},
    variables: {},
}

describe('Dashboard', () => {
    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        useMocks({
            get: {
                '/api/environments/:team_id/insights/:id/': () => [200, { results: [] }],
            },
        })
        initKeaTests()
    })

    afterEach(() => {
        cleanup()
    })

    it('shows save controls when editing a project homepage dashboard', () => {
        const logic = dashboardLogic({
            id: MOCK_DASHBOARD.id,
            dashboard: MOCK_DASHBOARD,
            placement: DashboardPlacement.ProjectHomepage,
        })
        logic.mount()
        logic.actions.setDashboardMode(DashboardMode.Edit, DashboardEventSource.Browser)

        render(
            <Dashboard
                id={String(MOCK_DASHBOARD.id)}
                dashboard={MOCK_DASHBOARD}
                placement={DashboardPlacement.ProjectHomepage}
            />
        )

        expect(document.querySelector('[data-attr="dashboard-edit-mode-discard"]')).toBeInTheDocument()
        expect(document.querySelector('[data-attr="dashboard-edit-mode-save"]')).toBeInTheDocument()

        logic.unmount()
    })
})
