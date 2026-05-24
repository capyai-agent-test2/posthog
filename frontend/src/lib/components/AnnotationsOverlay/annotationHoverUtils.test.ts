import { shouldActivateAnnotationHover } from './annotationHoverUtils'

jest.mock('scenes/insights/useInsightTooltip', () => ({
    isInsightHoverTooltipVisible: jest.fn(),
}))

const { isInsightHoverTooltipVisible } = jest.requireMock('scenes/insights/useInsightTooltip') as {
    isInsightHoverTooltipVisible: jest.Mock
}

describe('shouldActivateAnnotationHover', () => {
    it('keeps locked annotations interactive even while the chart tooltip is visible', () => {
        isInsightHoverTooltipVisible.mockReturnValue(true)

        expect(shouldActivateAnnotationHover(true)).toBe(true)
    })

    it('suppresses annotation hover when the chart tooltip is visible', () => {
        isInsightHoverTooltipVisible.mockReturnValue(true)

        expect(shouldActivateAnnotationHover(false)).toBe(false)
    })

    it('allows annotation hover when the chart tooltip is hidden', () => {
        isInsightHoverTooltipVisible.mockReturnValue(false)

        expect(shouldActivateAnnotationHover(false)).toBe(true)
    })
})
