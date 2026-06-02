import { MOCK_DEFAULT_TEAM } from 'lib/api.mock'

import { expectLogic } from 'kea-test-utils'

import { lemonToast } from '@posthog/lemon-ui'

import api from 'lib/api'
import { teamLogic } from 'scenes/teamLogic'

import { initKeaTests } from '~/test/init'

import { liveEventsLogic } from './liveEventsLogic'

jest.mock('lib/api')

const mockStream = api.stream as jest.MockedFunction<typeof api.stream>

describe('liveEventsLogic', () => {
    beforeEach(() => {
        initKeaTests(true, MOCK_DEFAULT_TEAM)
        mockStream.mockReset()
        jest.spyOn(lemonToast, 'error').mockImplementation(jest.fn())
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('retries live stream errors in the background without showing an error toast', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(jest.fn())
        mockStream.mockImplementation(async (_url, options) => {
            options.onError(new Error('no events available'))
        })

        const logic = liveEventsLogic()
        logic.mount()

        await expectLogic(logic).toDispatchActions(['updateEventsConnection'])

        expect(mockStream).toHaveBeenCalledWith(
            expect.stringContaining('/events'),
            expect.objectContaining({
                headers: { Authorization: `Bearer ${MOCK_DEFAULT_TEAM.live_events_token}` },
            })
        )
        expect(lemonToast.error).not.toHaveBeenCalled()
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1)

        logic.unmount()
        teamLogic.unmount()
    })
})
