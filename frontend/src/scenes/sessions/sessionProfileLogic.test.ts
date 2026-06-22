import { expectLogic } from 'kea-test-utils'

import api from 'lib/api'

import { initKeaTests } from '~/test/init'

import { sessionProfileLogic } from './sessionProfileLogic'

describe('sessionProfileLogic', () => {
    beforeEach(() => {
        initKeaTests()
        jest.spyOn(api, 'queryHogQL').mockResolvedValue({ results: [] } as any)
        jest.spyOn(api.recordings, 'list').mockResolvedValue({ results: [] } as any)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('queries session events by $session_id so UUID matches stay case-insensitive', async () => {
        const sessionId = '019c8fa8-0a87-7cc4-ab75-5b205f487354'
        const logic = sessionProfileLogic({ sessionId })

        logic.mount()
        await expectLogic(logic).toFinishAllListeners()

        const queries = jest.mocked(api.queryHogQL).mock.calls.map(([query]) => String(query))

        expect(queries.some((query) => query.includes(`AND $session_id = '${sessionId}'`))).toBe(true)
        expect(queries.some((query) => query.includes('`$session_id`'))).toBe(false)

        logic.unmount()
    })
})
