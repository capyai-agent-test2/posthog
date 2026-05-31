import { submitZendeskRequestWithBeaconFallback } from './supportLogic'

describe('supportLogic', () => {
    const originalFetch = global.fetch
    const originalSendBeacon = navigator.sendBeacon

    beforeEach(() => {
        jest.clearAllMocks()
    })

    afterEach(() => {
        global.fetch = originalFetch
        Object.defineProperty(navigator, 'sendBeacon', {
            configurable: true,
            value: originalSendBeacon,
        })
    })

    it('uses fetch when the Zendesk request succeeds', async () => {
        const response = new Response('{}', { status: 201 })
        global.fetch = jest.fn().mockResolvedValue(response)
        const sendBeacon = jest.fn()
        Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon })

        const result = await submitZendeskRequestWithBeaconFallback('{"request":{}}')

        expect(result).toEqual({ method: 'fetch', response })
        expect(sendBeacon).not.toHaveBeenCalled()
    })

    it('falls back to Beacon when mobile fetch fails before returning a response', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('Load failed'))
        const sendBeacon = jest.fn().mockReturnValue(true)
        Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: sendBeacon })

        const result = await submitZendeskRequestWithBeaconFallback('{"request":{}}')

        expect(result).toEqual({ method: 'beacon' })
        expect(sendBeacon).toHaveBeenCalledWith(
            'https://posthoghelp.zendesk.com/api/v2/requests.json',
            expect.any(Blob)
        )
    })

    it('returns the failed fetch response when Beacon is unavailable', async () => {
        const response = new Response('bad request', { status: 422 })
        global.fetch = jest.fn().mockResolvedValue(response)
        Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: undefined })

        const result = await submitZendeskRequestWithBeaconFallback('{"request":{}}')

        expect(result).toEqual({ method: 'fetch', response })
    })
})
