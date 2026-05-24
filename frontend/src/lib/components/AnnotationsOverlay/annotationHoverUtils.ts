import { isInsightHoverTooltipVisible } from 'scenes/insights/useInsightTooltip'

export function shouldActivateAnnotationHover(isDateLocked: boolean): boolean {
    return isDateLocked || !isInsightHoverTooltipVisible()
}
