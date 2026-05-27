import { JsonType } from '~/types'

type EventPropertyValue = JsonType | undefined

export function getLiveEventLocationValue(properties: Record<string, JsonType>): string | null {
    const locationValue =
        getStringLikeValue(properties['$current_url']) ??
        getStringLikeValue(properties['$screen_name']) ??
        getStringLikeValue(properties['$pathname'])

    return locationValue || null
}

export function getLiveEventHostOrigin(properties: Record<string, JsonType>): string | null {
    const currentUrl = getStringLikeValue(properties['$current_url'])

    if (!currentUrl) {
        return null
    }

    try {
        const { protocol, host } = new URL(currentUrl)
        return `${protocol}//${host}`
    } catch {
        return null
    }
}

function getStringLikeValue(value: EventPropertyValue): string | null {
    if (typeof value === 'string') {
        return value
    }

    if (value && typeof value === 'object' && 'url' in value && typeof value.url === 'string') {
        return value.url
    }

    return null
}
