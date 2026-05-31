import { getTooltipPosition } from './useInsightTooltip'

const canvasBounds = {
    left: 100,
    top: 100,
} as DOMRect

describe('getTooltipPosition', () => {
    it('keeps tall tooltips inside the viewport instead of positioning them above it', () => {
        const position = getTooltipPosition({
            canvasBounds,
            caretX: 10,
            caretY: 500,
            centerVertically: false,
            tooltipWidth: 300,
            tooltipHeight: 900,
            viewportWidth: 1200,
            viewportHeight: 600,
            scrollX: 0,
            scrollY: 0,
        })

        expect(position.top).toBe(8)
        expect(position.maxHeight).toBe(584)
    })

    it('flips horizontally when the tooltip would overflow the right edge', () => {
        const position = getTooltipPosition({
            canvasBounds: {
                ...canvasBounds,
                left: 1000,
            } as DOMRect,
            caretX: 100,
            caretY: 100,
            centerVertically: false,
            tooltipWidth: 300,
            tooltipHeight: 200,
            viewportWidth: 1200,
            viewportHeight: 600,
            scrollX: 0,
            scrollY: 0,
        })

        expect(position.left).toBe(792)
    })
})
