import { api, MOCK_DEFAULT_TEAM, MOCK_TEAM_ID } from 'lib/api.mock'

import { expectLogic } from 'kea-test-utils'

import { ApiConfig, ApiError } from 'lib/api'

import { initKeaTests } from '~/test/init'
import { AppContext } from '~/types'

import { teamLogic } from './teamLogic'

describe('teamLogic', () => {
    let logic: ReturnType<typeof teamLogic.build>

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('when team is loaded', () => {
        beforeEach(() => {
            initKeaTests()
            jest.spyOn(api, 'get').mockResolvedValue(MOCK_DEFAULT_TEAM)
            logic = teamLogic()
            logic.mount()
        })

        it('currentTeamIdStrict returns the team id', async () => {
            await expectLogic(logic).toDispatchActions(['loadCurrentTeamSuccess'])
            expect(logic.values.currentTeamIdStrict).toBe(MOCK_TEAM_ID)
        })

        it('currentProjectId returns the project id', async () => {
            await expectLogic(logic).toDispatchActions(['loadCurrentTeamSuccess'])
            expect(logic.values.currentProjectId).toBe(MOCK_DEFAULT_TEAM.project_id)
        })

        it('reloads the same team by id instead of relying on @current', async () => {
            await expectLogic(logic).toDispatchActions(['loadCurrentTeamSuccess'])
            api.get.mockClear()

            logic.actions.loadCurrentTeam()

            await expectLogic(logic).toDispatchActions(['loadCurrentTeam', 'loadCurrentTeamSuccess'])
            expect(api.get).toHaveBeenCalledWith(`api/environments/${MOCK_TEAM_ID}`)
        })

        it.each([403, 404])('clears stale team context on %s responses', async (statusCode) => {
            await expectLogic(logic).toDispatchActions(['loadCurrentTeamSuccess'])
            api.get.mockRejectedValueOnce(new ApiError('nope', statusCode))

            await expectLogic(logic, () => {
                logic.actions.loadCurrentTeam()
            }).toDispatchActions(['loadCurrentTeam', 'loadCurrentTeamSuccess'])

            expect(logic.values.currentTeam).toBeNull()
            expect(ApiConfig.hasCurrentTeamId()).toBe(false)
            expect(() => ApiConfig.getCurrentTeamId()).toThrow('Team ID is not known.')
        })
    })

    describe('before team is loaded', () => {
        beforeEach(() => {
            initKeaTests(false)
            // Clear team context after initKeaTests so currentTeam starts as null
            window.POSTHOG_APP_CONTEXT = {
                ...window.POSTHOG_APP_CONTEXT,
                current_team: undefined,
            } as unknown as AppContext
            logic = teamLogic()
            logic.mount()
        })

        it('currentTeamIdStrict returns @current fallback', () => {
            expect(logic.values.currentTeamIdStrict).toBe('@current')
        })

        it('currentProjectId returns @current fallback', () => {
            expect(logic.values.currentProjectId).toBe('@current')
        })

        it('currentTeamId returns null (non-breaking)', () => {
            expect(logic.values.currentTeamId).toBeNull()
        })

        it('falls back to @current before the team is known', async () => {
            jest.spyOn(api, 'get').mockResolvedValue(MOCK_DEFAULT_TEAM)
            api.get.mockClear()

            logic.actions.loadCurrentTeam()

            await expectLogic(logic).toDispatchActions(['loadCurrentTeam', 'loadCurrentTeamSuccess'])
            expect(api.get).toHaveBeenCalledWith('api/environments/@current')
        })
    })
})
