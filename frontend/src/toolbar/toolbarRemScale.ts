const DEFAULT_TOOLBAR_REM_PX = 16
const MIN_REASONABLE_REM_PX = 8
const MAX_REASONABLE_REM_PX = 24

export function getToolbarRemScale(doc: Document = document): number {
    const rootFontSize = Number.parseFloat(doc.defaultView?.getComputedStyle(doc.documentElement).fontSize || '')

    if (!Number.isFinite(rootFontSize) || rootFontSize <= 0) {
        return 1
    }

    if (rootFontSize >= MIN_REASONABLE_REM_PX && rootFontSize <= MAX_REASONABLE_REM_PX) {
        return 1
    }

    return DEFAULT_TOOLBAR_REM_PX / rootFontSize
}
