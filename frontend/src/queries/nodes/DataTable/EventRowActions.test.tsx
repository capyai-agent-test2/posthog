import '@testing-library/jest-dom'

import { render } from '@testing-library/react'

import { EventRowActions } from './EventRowActions'

jest.mock('scenes/insights/utils', () => ({
    insightUrlForEvent: jest.fn(() => null),
}))

jest.mock('~/models/saveAsActionDialog', () => ({
    saveActionFromEvent: jest.fn(),
}))

jest.mock('scenes/teamLogic', () => ({
    teamLogic: {
        findMounted: jest.fn(() => ({
            values: {
                currentTeam: {
                    data_attributes: [],
                },
            },
        })),
    },
}))

jest.mock('lib/utils/getAppContext', () => ({
    getCurrentTeamId: jest.fn(() => 1),
}))

jest.mock('scenes/surveys/components/ArchiveSurveyButton', () => ({
    ArchiveSurveyButton: () => null,
}))

jest.mock('lib/components/ViewRecordingButton/ViewRecordingButton', () => {
    const MockViewRecordingButton = (props: { sessionId?: string; checkRecordingExists?: boolean }): JSX.Element => (
        <div
            data-attr="view-recording-button"
            data-session-id={props.sessionId}
            data-check-recording-exists={String(props.checkRecordingExists)}
        />
    )

    return {
        __esModule: true,
        default: MockViewRecordingButton,
        RecordingPlayerType: {
            NewTab: 'new_tab',
        },
    }
})

describe('EventRowActions', () => {
    it('checks recording existence before linking to a replay from an event row', () => {
        const { container } = render(
            <EventRowActions
                event={
                    {
                        event: '$pageview',
                        timestamp: '2024-01-01T00:00:00Z',
                        properties: {
                            $session_id: 'session-123',
                        },
                    } as any
                }
            />
        )

        const button = container.querySelector('[data-attr="view-recording-button"]')
        expect(button).toHaveAttribute('data-session-id', 'session-123')
        expect(button).toHaveAttribute('data-check-recording-exists', 'true')
    })
})
