import { formatBreakdownLabel } from 'scenes/insights/utils'

import { FormatPropertyValueForDisplayFunction } from '~/models/propertyDefinitionsModel'
import { CohortType, TrendResult } from '~/types'

export function getTrendResultLabel(
    item: Pick<TrendResult, 'label' | 'breakdown_value' | 'filter'>,
    cohorts: CohortType[] | undefined,
    formatPropertyValueForDisplay: FormatPropertyValueForDisplayFunction | undefined
): string {
    if (item.breakdown_value !== undefined) {
        return formatBreakdownLabel(
            item.breakdown_value,
            item.filter,
            cohorts,
            formatPropertyValueForDisplay,
            undefined,
            item.label
        )
    }

    return item.label || ''
}
