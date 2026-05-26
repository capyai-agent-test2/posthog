import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import { useActions, useValues } from 'kea'
import type { ReactNode } from 'react'

import { hogFunctionRequestModalLogic } from './hogFunctionRequestModalLogic'
import { HogFunctionList } from './HogFunctionsList'
import { hogFunctionsListLogic } from './hogFunctionsListLogic'

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    BindLogic: ({ children }: { children: ReactNode }) => <>{children}</>,
    useValues: jest.fn(),
    useActions: jest.fn(),
}))

const lemonTableMock = jest.fn(({ pagination }: { pagination: { pageSize: number } }) => (
    <div data-testid="hog-function-table">page size {pagination.pageSize}</div>
))

jest.mock('@posthog/lemon-ui', () => ({
    LemonBadge: { Number: ({ count }: { count: number }) => <div>{count}</div> },
    LemonButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    LemonCheckbox: () => <div />,
    LemonInput: () => <input />,
    LemonTable: (props: any) => lemonTableMock(props),
    LemonTag: ({ children }: any) => <div>{children}</div>,
    Link: ({ children }: any) => <div>{children}</div>,
    Tooltip: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@posthog/icons', () => ({
    IconBell: () => <div />,
}))

jest.mock('lib/components/AppMetrics/AppMetricsSparkline', () => ({
    AppMetricsSparkline: () => <div />,
}))

jest.mock('lib/components/MemberSelect', () => ({
    MemberSelect: () => <div />,
}))

jest.mock('lib/hooks/useOnMountEffect', () => ({
    useOnMountEffect: jest.fn(),
}))

jest.mock('lib/lemon-ui/LemonButton/More', () => ({
    More: () => <div />,
}))

jest.mock('lib/lemon-ui/LemonMenu/LemonMenu', () => ({
    LemonMenuOverlay: () => <div />,
}))

jest.mock('lib/lemon-ui/LemonTable/columnUtils', () => ({
    createdByColumn: jest.fn(() => ({ title: 'Created by' })),
    updatedAtColumn: jest.fn(() => ({ title: 'Updated at' })),
}))

jest.mock('lib/lemon-ui/LemonTable/LemonTableLink', () => ({
    LemonTableLink: () => <div />,
}))

jest.mock('scenes/urls', () => ({
    urls: {
        settings: jest.fn(() => '/settings'),
        errorTrackingConfiguration: jest.fn(() => '/error-tracking'),
        legacyPlugin: jest.fn(() => '/legacy-plugin'),
        batchExport: jest.fn(() => '/batch-export'),
        hogFunction: jest.fn(() => '/hog-function'),
    },
}))

jest.mock('../configuration/HogFunctionIcon', () => ({
    HogFunctionIcon: () => <div />,
}))

jest.mock('../hog-function-utils', () => ({
    humanizeHogFunctionType: jest.fn(() => 'destination'),
}))

jest.mock('../misc/HogFunctionStatusIndicator', () => ({
    HogFunctionStatusIndicator: () => <div />,
}))

jest.mock('../sub-templates/sub-templates', () => ({
    eventToHogFunctionContextId: jest.fn(() => null),
}))

jest.mock('./HogFunctionOrderModal', () => ({
    HogFunctionOrderModal: () => <div />,
}))

jest.mock('./hogFunctionRequestModalLogic', () => ({
    hogFunctionRequestModalLogic: { __mock: 'hogFunctionRequestModalLogic' },
}))

jest.mock('./hogFunctionsListLogic', () => ({
    hogFunctionsListLogic: jest.fn(() => ({ __mock: 'hogFunctionsListLogic' })),
}))

const mockedUseValues = useValues as jest.Mock
const mockedUseActions = useActions as jest.Mock
const mockedHogFunctionsListLogic = hogFunctionsListLogic as jest.Mock

describe('HogFunctionList', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        mockedUseValues.mockImplementation((logic) => {
            if (logic === hogFunctionRequestModalLogic) {
                return {}
            }
            return {
                loading: false,
                filteredHogFunctions: [],
                filters: {},
                hogFunctions: [],
                hiddenHogFunctions: [],
            }
        })

        mockedUseActions.mockImplementation((logic) => {
            if (logic === hogFunctionRequestModalLogic) {
                return { openFeedbackDialog: jest.fn() }
            }
            return {
                loadHogFunctions: jest.fn(),
                setFilters: jest.fn(),
                resetFilters: jest.fn(),
                toggleEnabled: jest.fn(),
                deleteHogFunction: jest.fn(),
                setReorderModalOpen: jest.fn(),
            }
        })
    })

    it('limits destinations to 20 rows per page', () => {
        render(<HogFunctionList type="destination" />)

        expect(mockedHogFunctionsListLogic).toHaveBeenCalledWith({ type: 'destination' })
        expect(screen.getByText('page size 20')).toBeInTheDocument()
    })

    it('keeps 30 rows per page for non-destination lists', () => {
        render(<HogFunctionList type="transformation" />)

        expect(mockedHogFunctionsListLogic).toHaveBeenCalledWith({ type: 'transformation' })
        expect(screen.getByText('page size 30')).toBeInTheDocument()
    })
})
