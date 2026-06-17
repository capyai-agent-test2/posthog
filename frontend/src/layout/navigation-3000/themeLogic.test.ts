import { expectLogic } from 'kea-test-utils'

import { sceneLogic } from 'scenes/sceneLogic'
import { emptySceneParams } from 'scenes/scenes'
import { Scene } from 'scenes/sceneTypes'
import { userLogic } from 'scenes/userLogic'

import { initKeaTests } from '~/test/init'

import { themeLogic } from './themeLogic'

describe('themeLogic', () => {
    beforeEach(() => {
        window.POSTHOG_APP_CONTEXT = {
            ...window.POSTHOG_APP_CONTEXT,
            current_user: null,
        } as any

        initKeaTests()
        userLogic.mount()
        sceneLogic.mount()
        themeLogic.mount()
    })

    it('uses system dark mode on the unauthenticated email verification page', async () => {
        sceneLogic.actions.setTabs([
            {
                id: 'tab-1',
                active: true,
                pathname: '/verify_email/123',
                search: '',
                hash: '',
                title: 'Verify email',
                iconType: 'blank',
                sceneId: Scene.VerifyEmail,
            },
        ])
        sceneLogic.actions.setScene(Scene.VerifyEmail, undefined, 'tab-1', emptySceneParams)

        await expectLogic(themeLogic, () => {
            themeLogic.actions.syncDarkModePreference(true)
        }).toMatchValues({ isDarkModeOn: true })
    })

    it('keeps other unauthenticated pages in light mode', async () => {
        sceneLogic.actions.setTabs([
            {
                id: 'tab-1',
                active: true,
                pathname: '/login',
                search: '',
                hash: '',
                title: 'Login',
                iconType: 'blank',
                sceneId: Scene.Login,
            },
        ])
        sceneLogic.actions.setScene(Scene.Login, undefined, 'tab-1', emptySceneParams)

        await expectLogic(themeLogic, () => {
            themeLogic.actions.syncDarkModePreference(true)
        }).toMatchValues({ isDarkModeOn: false })
    })
})
