import { parseCouponCampaign } from './utils'

describe('parseCouponCampaign', () => {
    const testCases: [string, string | null][] = [
        // Onboarding coupon URLs
        ['/onboarding/coupons/lenny', 'lenny'],
        ['/onboarding/coupons/my-campaign', 'my-campaign'],

        // With project prefix
        ['/project/67/onboarding/coupons/lenny', 'lenny'],

        // With query params
        ['/onboarding/coupons/lenny?foo=bar', 'lenny'],

        // With trailing slash
        ['/onboarding/coupons/lenny/', 'lenny'],

        // Non-matching paths
        ['/other/path', null],
        ['/coupons/lenny', null],
        ['/coupons/', null],
        ['', null],
    ]

    testCases.forEach(([path, expected]) => {
        it(`parseCouponCampaign("${path}") returns ${expected === null ? 'null' : `"${expected}"`}`, () => {
            expect(parseCouponCampaign(path)).toBe(expected)
        })
    })
})
