import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import { useActions, useValues } from 'kea'
import type { ReactNode } from 'react'

import { preflightLogic } from 'scenes/PreflightCheck/preflightLogic'

import { initKeaTests } from '~/test/init'

import { NO_SDK_ACTIVITY_MESSAGE } from './sdkConstants'
import { sdkDoctorLogic } from './sdkDoctorLogic'
import { SdkDoctorScene } from './SdkDoctorScene'

jest.mock('posthog-js')

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useValues: jest.fn(),
    useActions: jest.fn(),
}))

jest.mock('lib/hooks/useOnMountEffect', () => ({
    useOnMountEffect: jest.fn(),
}))

jest.mock('~/layout/scenes/components/SceneContent', () => ({
    SceneContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

jest.mock('~/layout/scenes/components/SceneTitleSection', () => ({
    SceneTitleSection: ({ name, actions }: { name: string; actions: ReactNode }) => (
        <div>
            <div>{name}</div>
            {actions}
        </div>
    ),
}))

jest.mock('./SdkDoctorComponents', () => ({
    SdkSection: () => <div data-attr="sdk-section" />,
}))

const mockedUseValues = useValues as jest.Mock
const mockedUseActions = useActions as jest.Mock

describe('SdkDoctorScene', () => {
    beforeEach(() => {
        initKeaTests()
        mockedUseActions.mockReturnValue({
            loadRawData: jest.fn(),
            snoozeSdkDoctor: jest.fn(),
        })
        mockedUseValues.mockImplementation((logic) => {
            if (logic === sdkDoctorLogic) {
                return {
                    augmentedData: {},
                    rawDataLoading: false,
                    needsUpdatingCount: 0,
                    hasErrors: false,
                    snoozedUntil: null,
                }
            }

            if (logic === preflightLogic) {
                return { isDev: false }
            }

            return {}
        })
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('shows a no-sdk-activity message when no PostHog SDK events were found', () => {
        render(<SdkDoctorScene />)

        expect(screen.getByText(NO_SDK_ACTIVITY_MESSAGE)).toBeInTheDocument()
        expect(screen.queryByText('Error loading SDK information. Please try again later.')).not.toBeInTheDocument()
    })
})
