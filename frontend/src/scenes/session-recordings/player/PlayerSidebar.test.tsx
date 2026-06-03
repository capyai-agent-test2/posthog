import '@testing-library/jest-dom'

import { render } from '@testing-library/react'
import { useActions, useValues } from 'kea'

import { SessionRecordingSidebarStacking, SessionRecordingSidebarTab } from '~/types'

import { PlayerSidebar } from './PlayerSidebar'

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useValues: jest.fn(),
    useActions: jest.fn(),
}))

jest.mock('@posthog/icons', () => ({
    IconBottomPanel: () => <span>bottom-panel</span>,
    IconSidePanel: () => <span>side-panel</span>,
    IconX: () => <span>close</span>,
}))

jest.mock('@posthog/lemon-ui', () => ({
    LemonButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    LemonTabs: () => <div data-testid="player-sidebar-tabs" />,
}))

jest.mock('lib/components/Resizer/Resizer', () => ({
    Resizer: () => <div data-testid="player-sidebar-resizer" />,
}))

jest.mock('lib/integrations/integrationsLogic', () => ({
    integrationsLogic: { __mock: 'integrationsLogic' },
}))

jest.mock('./playerSettingsLogic', () => ({
    playerSettingsLogic: { __mock: 'playerSettingsLogic' },
}))

jest.mock('./sessionRecordingPlayerLogic', () => ({
    sessionRecordingPlayerLogic: { __mock: 'sessionRecordingPlayerLogic' },
}))

jest.mock('./sidebar/playerSidebarLogic', () => ({
    playerSidebarLogic: { __mock: 'playerSidebarLogic' },
}))

jest.mock('./sidebar/PlayerSidebarTab', () => ({
    PlayerSidebarTab: () => <div data-testid="player-sidebar-tab-content" />,
}))

const mockedUseValues = useValues as jest.Mock
const mockedUseActions = useActions as jest.Mock

describe('PlayerSidebar', () => {
    beforeEach(() => {
        mockedUseValues.mockReset()
        mockedUseActions.mockReset()

        mockedUseActions.mockReturnValue({
            setTab: jest.fn(),
            setSidebarOpen: jest.fn(),
            setPreferredSidebarStacking: jest.fn(),
        })

        mockedUseValues.mockImplementation((logic) => {
            const tag = logic?.__mock

            if (tag === 'playerSidebarLogic') {
                return { activeTab: SessionRecordingSidebarTab.OVERVIEW }
            }

            if (tag === 'playerSettingsLogic') {
                return {
                    sidebarOpen: true,
                    preferredSidebarStacking: SessionRecordingSidebarStacking.Horizontal,
                    isVerticallyStacked: false,
                }
            }

            if (tag === 'integrationsLogic') {
                return { getIntegrationsByKind: () => [] }
            }

            if (tag === 'sessionRecordingPlayerLogic') {
                return { sessionPlayerMetaData: null }
            }

            return { desiredSize: null }
        })
    })

    it.each([
        ['renders the resizer while the sidebar is open', true, true],
        ['hides the resizer while the sidebar is closed', false, false],
    ])('%s', (_name, sidebarOpen, shouldRenderResizer) => {
        mockedUseValues.mockImplementation((logic) => {
            const tag = logic?.__mock

            if (tag === 'playerSidebarLogic') {
                return { activeTab: SessionRecordingSidebarTab.OVERVIEW }
            }

            if (tag === 'playerSettingsLogic') {
                return {
                    sidebarOpen,
                    preferredSidebarStacking: SessionRecordingSidebarStacking.Horizontal,
                    isVerticallyStacked: false,
                }
            }

            if (tag === 'integrationsLogic') {
                return { getIntegrationsByKind: () => [] }
            }

            if (tag === 'sessionRecordingPlayerLogic') {
                return { sessionPlayerMetaData: null }
            }

            return { desiredSize: null }
        })

        const { container } = render(<PlayerSidebar />)

        if (shouldRenderResizer) {
            expect(container.querySelector('[data-testid="player-sidebar-resizer"]')).toBeInTheDocument()
        } else {
            expect(container.querySelector('[data-testid="player-sidebar-resizer"]')).not.toBeInTheDocument()
        }
    })
})
