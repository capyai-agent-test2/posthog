import posthog from 'posthog-js'

import { loadPostHogJS } from './loadPostHogJS'

jest.mock('posthog-js')

describe('loadPostHogJS', () => {
    const mockedPosthog = posthog as jest.Mocked<typeof posthog>
    const originalApiKey = window.JS_POSTHOG_API_KEY
    const originalHost = window.JS_POSTHOG_HOST
    const originalUiHost = window.JS_POSTHOG_UI_HOST
    const originalGlobalErrors = window.POSTHOG_GLOBAL_ERRORS

    beforeEach(() => {
        jest.clearAllMocks()

        window.JS_POSTHOG_API_KEY = 'test-api-key'
        window.JS_POSTHOG_HOST = 'https://us.posthog.test'
        window.JS_POSTHOG_UI_HOST = 'https://app.posthog.test'
        window.POSTHOG_GLOBAL_ERRORS = {}

        mockedPosthog.get_session_id = jest.fn(() => 'session-id')
        mockedPosthog.init = jest.fn()
        mockedPosthog.onFeatureFlags = jest.fn()
        mockedPosthog.capture = jest.fn()
    })

    afterAll(() => {
        window.JS_POSTHOG_API_KEY = originalApiKey
        window.JS_POSTHOG_HOST = originalHost
        window.JS_POSTHOG_UI_HOST = originalUiHost
        window.POSTHOG_GLOBAL_ERRORS = originalGlobalErrors
    })

    it('clears the feature flag load error after a successful reload', () => {
        let onFeatureFlagsCallback:
            | ((
                  flags: string[],
                  variants: Record<string, string | boolean>,
                  context?: { errorsLoading?: boolean }
              ) => void)
            | undefined

        mockedPosthog.onFeatureFlags.mockImplementation((callback) => {
            onFeatureFlagsCallback = callback
        })

        loadPostHogJS()

        expect(onFeatureFlagsCallback).toBeTruthy()

        onFeatureFlagsCallback?.([], {}, { errorsLoading: true })
        expect(window.POSTHOG_GLOBAL_ERRORS?.onFeatureFlagsLoadError).toBe(true)
        expect(mockedPosthog.capture).toHaveBeenCalledWith('onFeatureFlags error')

        onFeatureFlagsCallback?.([], {}, {})
        expect(window.POSTHOG_GLOBAL_ERRORS?.onFeatureFlagsLoadError).toBeUndefined()
    })
})
