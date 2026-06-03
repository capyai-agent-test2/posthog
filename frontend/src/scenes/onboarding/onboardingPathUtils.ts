import { removeProjectIdIfPresent, stripTrailingSlash } from 'lib/utils/router-utils'
import { urls } from 'scenes/urls'

import { availableOnboardingProducts } from './utils'

export function isInvalidOnboardingPath(pathname: string, productKey: string | null): boolean {
    const cleanPath = stripTrailingSlash(removeProjectIdIfPresent(pathname))
    const pathProductKey = cleanPath.split('/')[2] ?? null

    if (cleanPath === urls.onboarding()) {
        return false
    }

    if (pathProductKey) {
        return !Object.hasOwn(availableOnboardingProducts, pathProductKey)
    }

    return !productKey
}
