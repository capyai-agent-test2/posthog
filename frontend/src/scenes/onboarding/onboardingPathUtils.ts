import { removeProjectIdIfPresent, stripTrailingSlash } from 'lib/utils/router-utils'
import { urls } from 'scenes/urls'

export function isInvalidOnboardingPath(pathname: string, productKey: string | null): boolean {
    const cleanPath = stripTrailingSlash(removeProjectIdIfPresent(pathname))

    return !productKey && cleanPath !== urls.onboarding()
}
