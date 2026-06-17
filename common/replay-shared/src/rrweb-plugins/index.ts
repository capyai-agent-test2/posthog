import { ReplayPlugin, playerConfig } from 'posthog-js/rrweb'

import { PLACEHOLDER_SVG_DATA_IMAGE_URL } from '../mobile/transformer/shared'

const PROXY_URL = 'https://replay.ph-proxy.com' as const
const HTTP_URL_PATTERN = /^(https?:\/\/[^\s"'()?#]+(?:[?#][^\s"'()]*)?)$/i
const JS_URL_PATTERN = /^(https?:\/\/[^\s"?#]+\.js(?:[?#][^\s"]*)?)$/i

export const CorsPlugin: ReplayPlugin & {
    _proxyUrl: (value: string) => string
    _replaceAssetCssUrls: (value: string | null) => string | null
    _replaceAssetUrl: (value: string) => string
    _replaceSrcSetUrls: (value: string) => string
    _replaceJSUrl: (value: string) => string
} = {
    _proxyUrl: (value: string): string => `${PROXY_URL}/proxy?url=${value}`,

    _replaceAssetCssUrls: (value: string | null): string | null => {
        return (
            value?.replace(
                /url\((['"]?)(https?:\/\/[^\s"'()]+(?:[?#][^\s"'()]*)?)\1\)/gi,
                (_match, quote: string, url: string) => `url(${quote}${CorsPlugin._proxyUrl(url)}${quote})`
            ) || null
        )
    },

    _replaceAssetUrl: (value: string): string => {
        return HTTP_URL_PATTERN.test(value) ? value.replace(HTTP_URL_PATTERN, CorsPlugin._proxyUrl) : value
    },

    _replaceSrcSetUrls: (value: string): string => {
        return value
            .split(',')
            .map((srcSetEntry) => {
                const trimmedEntry = srcSetEntry.trim()
                if (!trimmedEntry) {
                    return trimmedEntry
                }

                const [url, descriptor] = trimmedEntry.split(/\s+/, 2)
                const proxiedUrl = CorsPlugin._replaceAssetUrl(url)
                return descriptor ? `${proxiedUrl} ${descriptor}` : proxiedUrl
            })
            .join(', ')
    },

    _replaceJSUrl: (value: string): string => {
        return value.replace(JS_URL_PATTERN, `${PROXY_URL}/proxy?url=$1`)
    },

    onBuild: (node) => {
        if (node.nodeName === 'STYLE') {
            const styleElement = node as HTMLStyleElement
            const childNodes = styleElement.childNodes
            for (let i = 0; i < childNodes.length; i++) {
                if (childNodes[i].nodeType == 3) {
                    const updatedContent = CorsPlugin._replaceAssetCssUrls(childNodes[i].textContent)
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
                linkElement.href = CorsPlugin._replaceAssetUrl(href)
            }
        }

        if (node.nodeName === 'SCRIPT') {
            const scriptElement = node as HTMLScriptElement
            scriptElement.src = CorsPlugin._replaceJSUrl(scriptElement.src)
        }

        if (node.nodeName === 'IMG' || node.nodeName === 'SOURCE') {
            const assetNode = node as HTMLImageElement | HTMLSourceElement
            if (assetNode.src) {
                assetNode.src = CorsPlugin._replaceAssetUrl(assetNode.src)
            }
            if (assetNode.srcset) {
                assetNode.srcset = CorsPlugin._replaceSrcSetUrls(assetNode.srcset)
            }
        }
    },
}

const defaultStyleRules = `.ph-no-capture { background-image: ${PLACEHOLDER_SVG_DATA_IMAGE_URL}; }`
const shopifyShorthandCSSFix =
    '@media (prefers-reduced-motion: no-preference) { .scroll-trigger:not(.scroll-trigger--offscreen).animate--slide-in { animation: var(--animation-slide-in) } }'

export const COMMON_REPLAYER_CONFIG: Partial<playerConfig> = {
    triggerFocus: false,
    insertStyleRules: [defaultStyleRules, shopifyShorthandCSSFix],
    // Keep the replay iframe scriptless. UNSAFE_replayCanvas makes rrweb add `allow-scripts`
    // to the sandbox, which combined with the required `allow-same-origin` lets untrusted
    // recorded content escape the sandbox into the app origin. Canvas is replayed via
    // CanvasReplayerPlugin instead, which needs no in-frame scripting.
    UNSAFE_replayCanvas: false,
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
