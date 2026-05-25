import { router } from 'kea-router'
import { expectLogic } from 'kea-test-utils'

import { lemonToast } from '@posthog/lemon-ui'

import apiReal from 'lib/api'

import { useMocks } from '~/mocks/jest'
import { initKeaTests } from '~/test/init'
import { IntegrationKind } from '~/types'

import { integrationsLogic } from './integrationsLogic'

describe('integrationsLogic — handleOauthCallback', () => {
    let logic: ReturnType<typeof integrationsLogic.build>
    let createSpy: jest.SpyInstance
    let toastErrorSpy: jest.SpyInstance

    useMocks({
        get: {
            '/api/environments/:team_id/integrations/': () => [200, { results: [] }],
        },
    })

    beforeEach(() => {
        initKeaTests()
        logic = integrationsLogic()
        logic.mount()
        createSpy = jest.spyOn(apiReal.integrations, 'create')
        toastErrorSpy = jest.spyOn(lemonToast, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('redirects stripe marketplace callbacks to the confirmation page without POSTing', async () => {
        await expectLogic(logic, () => {
            logic.actions.handleOauthCallback('stripe' as IntegrationKind, {
                code: 'ac_123',
                stripe_user_id: 'acct_456',
                account_id: 'acc_789',
                user_id: 'usr_1',
            })
        }).toFinishAllListeners()

        expect(createSpy).not.toHaveBeenCalled()
        expect(router.values.location.pathname).toContain('/integrations/stripe/confirm-install')
        expect(router.values.searchParams).toEqual({
            code: 'ac_123',
            stripe_user_id: 'acct_456',
            account_id: 'acc_789',
            user_id: 'usr_1',
        })
    })

    it('omits empty account_id and user_id when redirecting to the confirmation page', async () => {
        await expectLogic(logic, () => {
            logic.actions.handleOauthCallback('stripe' as IntegrationKind, {
                code: 'ac_123',
                stripe_user_id: 'acct_456',
            })
        }).toFinishAllListeners()

        expect(createSpy).not.toHaveBeenCalled()
        expect(router.values.location.pathname).toContain('/integrations/stripe/confirm-install')
        expect(router.values.searchParams).toEqual({
            code: 'ac_123',
            stripe_user_id: 'acct_456',
        })
    })

    it('shows the Bing Ads AADSTS650052 guidance instead of the raw invalid_client code', async () => {
        await expectLogic(logic, () => {
            logic.actions.handleOauthCallback('bing-ads' as IntegrationKind, {
                error: 'invalid_client',
                error_description:
                    "AADSTS650052: The app is trying to access a service 'd42ffc93-c136-491d-b4fd-6f18168c68fd' that your organization lacks a service principal for.",
            })
        }).toFinishAllListeners()

        expect(createSpy).not.toHaveBeenCalled()
        expect(toastErrorSpy).toHaveBeenCalledWith(
            'Microsoft rejected the Bing Ads authorization because your organization has not enabled the Microsoft Advertising API. Ask a Microsoft Entra admin to grant consent for Microsoft Advertising, then try again.'
        )
    })

    it('shows the provider error description for other OAuth callback failures', async () => {
        await expectLogic(logic, () => {
            logic.actions.handleOauthCallback('google-ads' as IntegrationKind, {
                error: 'access_denied',
                error_description: 'The user denied the request.',
            })
        }).toFinishAllListeners()

        expect(createSpy).not.toHaveBeenCalled()
        expect(toastErrorSpy).toHaveBeenCalledWith('The user denied the request.')
    })
})
