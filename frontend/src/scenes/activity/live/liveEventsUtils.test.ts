import { getLiveEventHostOrigin, getLiveEventLocationValue } from './liveEventsUtils'

describe('liveEventsUtils', () => {
    describe('getLiveEventLocationValue', () => {
        it.each([
            [{ $current_url: 'https://app.posthog.com/feature_flags' }, 'https://app.posthog.com/feature_flags'],
            [
                { $current_url: { url: 'https://app.posthog.com/feature_flags' } },
                'https://app.posthog.com/feature_flags',
            ],
            [{ $current_url: '', $screen_name: 'Checkout' }, 'Checkout'],
            [{ $screen_name: 'Checkout' }, 'Checkout'],
            [{ $pathname: '/feature_flags' }, '/feature_flags'],
            [{ $current_url: { label: 'nope' }, $screen_name: 'Checkout' }, 'Checkout'],
            [{ $current_url: 3 }, null],
        ])('returns %s for %s', (properties, expected) => {
            expect(getLiveEventLocationValue(properties)).toEqual(expected)
        })
    })

    describe('getLiveEventHostOrigin', () => {
        it.each([
            [{ $current_url: 'https://app.posthog.com/feature_flags?tab=metrics' }, 'https://app.posthog.com'],
            [{ $current_url: { url: 'https://app.posthog.com/feature_flags' } }, 'https://app.posthog.com'],
            [{ $current_url: '/relative-path' }, null],
            [{ $current_url: { label: 'nope' } }, null],
            [{}, null],
        ])('returns %s for %s', (properties, expected) => {
            expect(getLiveEventHostOrigin(properties)).toEqual(expected)
        })
    })
})
