import { router } from 'kea-router'

import { initKeaTests } from '~/test/init'

import { settingsLogic } from './settingsLogic'

describe('settingsLogic', () => {
    beforeEach(() => {
        initKeaTests()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
        jest.restoreAllMocks()
    })

    it.each([
        {
            description: 'does not reset the scroll position when navigating to a hashed setting',
            hashParams: { 'personal-api-keys': true },
            anchorExists: true,
            expectedCalls: 0,
        },
        {
            description: 'resets the scroll position when no matching hash target exists',
            hashParams: { 'personal-api-keys': true },
            anchorExists: false,
            expectedCalls: 1,
        },
    ])('$description', ({ hashParams, anchorExists, expectedCalls }) => {
        const scrollTo = jest.fn()
        const mainElement = { scrollTo } as unknown as HTMLElement

        jest.spyOn(document, 'querySelector').mockReturnValue(mainElement)
        jest.spyOn(document, 'getElementById').mockReturnValue(anchorExists ? ({} as HTMLElement) : null)

        router.actions.push('/settings/user-api-keys', {}, hashParams)

        const logic = settingsLogic({ logicKey: 'settingsTest' })
        logic.mount()

        logic.actions.selectSection('user-api-keys', 'user')
        jest.advanceTimersByTime(100)

        expect(scrollTo).toHaveBeenCalledTimes(expectedCalls)
    })
})
