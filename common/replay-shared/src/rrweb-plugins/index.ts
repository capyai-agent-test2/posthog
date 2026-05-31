import type { ReplayPlugin, playerConfig } from 'posthog-js/rrweb'
import type { inputData } from 'posthog-js/rrweb-types'

import { PLACEHOLDER_SVG_DATA_IMAGE_URL } from '../mobile/transformer/shared'

const PROXY_URL = 'https://replay.ph-proxy.com' as const

export const CorsPlugin: ReplayPlugin & {
    _replaceFontCssUrls: (value: string | null) => string | null
    _replaceFontUrl: (value: string) => string
    _replaceJSUrl: (value: string) => string
} = {
    _replaceFontCssUrls: (value: string | null): string | null => {
        return (
            value?.replace(
                /url\("(https:\/\/[^\s"?#]+\.(?:eot|woff2|ttf|woff)(?:[?#][^\s"]*)?)"\)/gi,
                `url("${PROXY_URL}/proxy?url=$1")`
            ) || null
        )
    },

    _replaceFontUrl: (value: string): string => {
        return value.replace(
            /^(https:\/\/[^\s"?#]+\.(?:eot|woff2|ttf|woff)(?:[?#][^\s"]*)?)$/i,
            `${PROXY_URL}/proxy?url=$1`
        )
    },

    _replaceJSUrl: (value: string): string => {
        return value.replace(/^(https:\/\/[^\s"?#]+\.js(?:[?#][^\s"]*)?)$/i, `${PROXY_URL}/proxy?url=$1`)
    },

    onBuild: (node) => {
        if (node.nodeName === 'STYLE') {
            const styleElement = node as HTMLStyleElement
            const childNodes = styleElement.childNodes
            for (let i = 0; i < childNodes.length; i++) {
                if (childNodes[i].nodeType == 3) {
                    const updatedContent = CorsPlugin._replaceFontCssUrls(childNodes[i].textContent)
                    if (updatedContent !== childNodes[i].textContent) {
                        childNodes[i].textContent = updatedContent
                    }
                }
            }
        }

        if (node.nodeName === 'LINK') {
            const linkElement = node as HTMLLinkElement
            const href = linkElement.href
            if (!href) {
                return
            }
            if (linkElement.getAttribute('rel') == 'modulepreload') {
                linkElement.href = CorsPlugin._replaceJSUrl(href)
            } else {
                linkElement.href = CorsPlugin._replaceFontUrl(href)
            }
        }

        if (node.nodeName === 'SCRIPT') {
            const scriptElement = node as HTMLScriptElement
            scriptElement.src = CorsPlugin._replaceJSUrl(scriptElement.src)
        }
    },
}

const defaultStyleRules = `.ph-no-capture { background-image: ${PLACEHOLDER_SVG_DATA_IMAGE_URL}; }`
const shopifyShorthandCSSFix =
    '@media (prefers-reduced-motion: no-preference) { .scroll-trigger:not(.scroll-trigger--offscreen).animate--slide-in { animation: var(--animation-slide-in) } }'

export const COMMON_REPLAYER_CONFIG: Partial<playerConfig> = {
    triggerFocus: false,
    insertStyleRules: [defaultStyleRules, shopifyShorthandCSSFix],
}

const NUMERIC_INPUT_VALUE_REGEX = /^[-+]?(\d+|\d*\.\d+)([eE][-+]?\d+)?$/
const RRWEB_EVENT_TYPE_INCREMENTAL_SNAPSHOT = 3
const RRWEB_INCREMENTAL_SOURCE_INPUT = 5

function isNonNumericValue(value: string | null): value is string {
    return !!value && !NUMERIC_INPUT_VALUE_REGEX.test(value)
}

function showNonNumericNumberInputValue(input: HTMLInputElement, value: string | null): void {
    if (input.type !== 'number' || !isNonNumericValue(value)) {
        return
    }

    input.type = 'text'
    input.value = value
    input.setAttribute('value', value)
}

export const FormControlReplayerPlugin: ReplayPlugin = {
    onBuild: (node) => {
        if (node.nodeName === 'SELECT') {
            const selectElement = node as HTMLSelectElement
            const value = selectElement.getAttribute('value')
            if (value !== null) {
                selectElement.value = value
            }
        }

        if (node.nodeName === 'INPUT') {
            const inputElement = node as HTMLInputElement
            showNonNumericNumberInputValue(inputElement, inputElement.getAttribute('value'))
        }
    },

    handler: (event, _isSync, { replayer }) => {
        if (
            event.type !== RRWEB_EVENT_TYPE_INCREMENTAL_SNAPSHOT ||
            event.data.source !== RRWEB_INCREMENTAL_SOURCE_INPUT
        ) {
            return
        }

        const data = event.data as inputData
        const node = replayer.getMirror().getNode(data.id)
        if (node?.nodeName !== 'INPUT') {
            return
        }

        showNonNumericNumberInputValue(node as HTMLInputElement, data.text)
    },
}

export { AudioMuteReplayerPlugin } from './audio-mute-plugin'
export { WindowTitlePlugin } from './window-title-plugin'

export function createHLSPlayerPlugin(): ReplayPlugin & { destroy: () => void } {
    const instances: Set<{ destroy: () => void }> = new Set()
    let destroyed = false

    return {
        onBuild: (node) => {
            if (node && node.nodeName === 'VIDEO' && node.nodeType === 1) {
                const videoEl = node as HTMLVideoElement
                const hlsSrc = videoEl.getAttribute('hls-src')

                if (videoEl && hlsSrc) {
                    void import('hls.js')
                        .then(({ default: Hls }) => {
                            if (destroyed) {
                                return
                            }
                            if (Hls.isSupported()) {
                                const hls = new Hls()
                                instances.add(hls)
                                hls.loadSource(hlsSrc)
                                hls.attachMedia(videoEl)

                                hls.on(Hls.Events.ERROR, (_, data) => {
                                    if (data.fatal) {
                                        switch (data.type) {
                                            case Hls.ErrorTypes.NETWORK_ERROR:
                                                hls.startLoad()
                                                break
                                            case Hls.ErrorTypes.MEDIA_ERROR:
                                                hls.recoverMediaError()
                                                break
                                            default:
                                                hls.destroy()
                                                instances.delete(hls)
                                                break
                                        }
                                    }
                                })
                            } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                                videoEl.src = hlsSrc
                            }
                        })
                        .catch(() => {
                            // Chunk load failure — fall back to native HLS if the browser supports it
                            if (destroyed) {
                                return
                            }
                            if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                                videoEl.src = hlsSrc
                            }
                        })
                }
            }
        },

        destroy: () => {
            destroyed = true

            for (const hls of instances) {
                hls.destroy()
            }
            instances.clear()
        },
    }
}

/** @deprecated Use createHLSPlayerPlugin() for proper lifecycle management */
export const HLSPlayerPlugin: ReplayPlugin = createHLSPlayerPlugin()
