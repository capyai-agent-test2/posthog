const MAX_DEFAULT_HEIGHT = 1000

export function getDefaultImageHeight({
    naturalHeight,
    naturalWidth,
    clientWidth,
}: {
    naturalHeight: number
    naturalWidth: number
    clientWidth: number
}): number {
    const height = naturalWidth > 0 && clientWidth > 0 ? (naturalHeight / naturalWidth) * clientWidth : naturalHeight

    return Math.min(height, MAX_DEFAULT_HEIGHT)
}
