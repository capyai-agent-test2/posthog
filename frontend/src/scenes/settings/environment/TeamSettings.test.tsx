import { MOCK_DEFAULT_TEAM } from 'lib/api.mock'

import '@testing-library/jest-dom'

import { cleanup, render, screen } from '@testing-library/react'

import { TeamMembershipLevel } from 'lib/constants'

import { initKeaTests } from '~/test/init'
import { AccessControlLevel, AccessControlResourceType } from '~/types'

import { TeamAuthorizedURLs } from './TeamSettings'

jest.mock('lib/components/AuthorizedUrlList/AuthorizedUrlList', () => ({
    AuthorizedUrlList: ({
        allowAdd,
        allowDelete,
        displaySuggestions,
    }: {
        allowAdd: boolean
        allowDelete: boolean
        displaySuggestions: boolean
    }) => (
        <div>
            <span data-attr="allow-add">{String(allowAdd)}</span>
            <span data-attr="allow-delete">{String(allowDelete)}</span>
            <span data-attr="display-suggestions">{String(displaySuggestions)}</span>
        </div>
    ),
}))

describe('TeamAuthorizedURLs', () => {
    afterEach(() => {
        cleanup()
    })

    it('allows project admins to edit domains even without web analytics manager access', () => {
        window.POSTHOG_APP_CONTEXT = {
            ...window.POSTHOG_APP_CONTEXT,
            resource_access_control: {
                ...window.POSTHOG_APP_CONTEXT?.resource_access_control,
                [AccessControlResourceType.WebAnalytics]: AccessControlLevel.Viewer,
            },
        }

        initKeaTests(true, {
            ...MOCK_DEFAULT_TEAM,
            effective_membership_level: TeamMembershipLevel.Admin,
        })

        render(<TeamAuthorizedURLs />)

        expect(screen.getByTestId('allow-add')).toHaveTextContent('true')
        expect(screen.getByTestId('allow-delete')).toHaveTextContent('true')
        expect(screen.getByTestId('display-suggestions')).toHaveTextContent('true')
    })

    it('keeps domains read-only for project members', () => {
        initKeaTests(true, {
            ...MOCK_DEFAULT_TEAM,
            effective_membership_level: TeamMembershipLevel.Member,
        })

        render(<TeamAuthorizedURLs />)

        expect(screen.getByTestId('allow-add')).toHaveTextContent('false')
        expect(screen.getByTestId('allow-delete')).toHaveTextContent('false')
        expect(screen.getByTestId('display-suggestions')).toHaveTextContent('false')
    })
})
