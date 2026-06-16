import { isInvalidOnboardingPath } from './onboardingPathUtils'

describe('isInvalidOnboardingPath', () => {
    it.each([
        { pathname: '/onboarding/some-random-string', productKey: null, expected: true },
        { pathname: '/onboarding/some-random-string', productKey: 'product_analytics', expected: true },
        { pathname: '/project/2/onboarding/some-random-string', productKey: null, expected: true },
        { pathname: '/onboarding', productKey: null, expected: false },
        { pathname: '/project/2/onboarding', productKey: null, expected: false },
        { pathname: '/onboarding/product_analytics', productKey: 'product_analytics', expected: false },
        { pathname: '/onboarding/product_analytics', productKey: null, expected: false },
    ])('returns $expected for $pathname with productKey $productKey', ({ pathname, productKey, expected }) => {
        expect(isInvalidOnboardingPath(pathname, productKey)).toBe(expected)
    })
})
