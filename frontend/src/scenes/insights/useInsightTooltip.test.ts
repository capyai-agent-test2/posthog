import { cleanupTooltip, ensureTooltip, showTooltip } from './useInsightTooltip'

describe('useInsightTooltip', () => {
    it('hides a visible tooltip when its owner unmounts after ownership was reassigned', () => {
        const [, tooltipElement] = ensureTooltip('tooltip-a')

        showTooltip('tooltip-a')
        expect(tooltipElement.style.opacity).toBe('1')

        ensureTooltip('tooltip-b')
        cleanupTooltip('tooltip-a')

        expect(tooltipElement.style.opacity).toBe('0')

        showTooltip('tooltip-b')
        expect(tooltipElement.style.opacity).toBe('1')

        cleanupTooltip('tooltip-b')
    })
})
