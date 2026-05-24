export type { CloudRegion } from '@/tools/types'

export {
    USER_AGENT,
    type GetUserAgentOptions,
    getUserAgent,
    POSTHOG_US_BASE_URL,
    POSTHOG_EU_BASE_URL,
    toCloudRegion,
    getBaseUrlForRegion,
    getCustomApiBaseUrl,
    isCloudApi,
    isLocalApi,
    MCP_DOCS_URL,
    OAUTH_PROXY_URL,
    OAUTH_SCOPES_SUPPORTED,
} from './oauth-constants'

import type { CloudRegion } from '@/tools/types'

import { resolveAuthorizationServerUrl } from './oauth-constants'

export const getAuthorizationServerUrl = (region?: CloudRegion | null): string => resolveAuthorizationServerUrl(region)
