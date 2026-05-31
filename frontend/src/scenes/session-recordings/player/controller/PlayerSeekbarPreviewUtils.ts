import { clamp } from 'lib/utils'

import { THUMB_OFFSET } from '../utils/playerUtils'

export function getSeekbarPreviewPercentage(
    event: MouseEvent,
    seekBar: HTMLElement,
    thumb: HTMLElement | null,
    thumbLeftPos: number
): number {
    const rect = seekBar.getBoundingClientRect()
    if (rect.width <= 0) {
        return 0
    }

    const x =
        thumb && event.target instanceof Node && thumb.contains(event.target)
            ? thumbLeftPos + THUMB_OFFSET
            : event.clientX - rect.x

    return clamp(x / rect.width, 0, 1)
}
