import { api, MOCK_DEFAULT_ORGANIZATION, MOCK_DEFAULT_PROJECT } from 'lib/api.mock'

import { expectLogic } from 'kea-test-utils'

import { initKeaTests } from '~/test/init'
import { AppContext } from '~/types'

import { organizationLogic } from './organizationLogic'
import { projectLogic } from './projectLogic'

describe('current context loaders', () => {
    describe('organizationLogic', () => {
        it('reloads the same organization by id instead of relying on @current', async () => {
            initKeaTests(false)
            jest.spyOn(api, 'get').mockResolvedValue(MOCK_DEFAULT_ORGANIZATION)
            const logic = organizationLogic()
            logic.mount()

            await expectLogic(logic).toDispatchActions(['loadCurrentOrganizationSuccess'])
            api.get.mockClear()

            logic.actions.loadCurrentOrganization()

            await expectLogic(logic).toDispatchActions(['loadCurrentOrganization', 'loadCurrentOrganizationSuccess'])
            expect(api.get).toHaveBeenCalledWith(`api/organizations/${MOCK_DEFAULT_ORGANIZATION.id}`)
        })

        it('falls back to @current before the organization is known', async () => {
            initKeaTests(false)
            jest.spyOn(api, 'get').mockResolvedValue(MOCK_DEFAULT_ORGANIZATION)
            window.POSTHOG_APP_CONTEXT = {
                ...window.POSTHOG_APP_CONTEXT,
                current_user: {
                    ...window.POSTHOG_APP_CONTEXT?.current_user,
                    organization: undefined,
                },
            } as unknown as AppContext

            const logic = organizationLogic()
            logic.mount()
            api.get.mockClear()

            logic.actions.loadCurrentOrganization()

            await expectLogic(logic).toDispatchActions(['loadCurrentOrganization', 'loadCurrentOrganizationSuccess'])
            expect(api.get).toHaveBeenCalledWith('api/organizations/@current')
        })
    })

    describe('projectLogic', () => {
        it('reloads the same project by id instead of relying on @current', async () => {
            initKeaTests(false)
            jest.spyOn(api, 'get').mockResolvedValue(MOCK_DEFAULT_PROJECT)
            const logic = projectLogic()
            logic.mount()

            await expectLogic(logic).toDispatchActions(['loadCurrentProjectSuccess'])
            api.get.mockClear()

            logic.actions.loadCurrentProject()

            await expectLogic(logic).toDispatchActions(['loadCurrentProject', 'loadCurrentProjectSuccess'])
            expect(api.get).toHaveBeenCalledWith(`api/projects/${MOCK_DEFAULT_PROJECT.id}`)
        })

        it('falls back to @current before the project is known', async () => {
            initKeaTests(false)
            jest.spyOn(api, 'get').mockResolvedValue(MOCK_DEFAULT_PROJECT)
            window.POSTHOG_APP_CONTEXT = {
                ...window.POSTHOG_APP_CONTEXT,
                current_project: undefined,
            } as unknown as AppContext

            const logic = projectLogic()
            logic.mount()
            api.get.mockClear()

            logic.actions.loadCurrentProject()

            await expectLogic(logic).toDispatchActions(['loadCurrentProject', 'loadCurrentProjectSuccess'])
            expect(api.get).toHaveBeenCalledWith('api/projects/@current')
        })
    })
})
