import { Dayjs, UnitTypeLong } from 'lib/dayjs'

import { RetentionFilter } from '~/queries/schema/schema-general'
import { RetentionPeriod } from '~/types'

import { ProcessedRetentionPayload } from './types'

export function formatRetentionCohortLabel(
    cohortRetention: ProcessedRetentionPayload,
    period?: RetentionPeriod
): string {
    if (!cohortRetention.date) {
        return cohortRetention.label
    }

    switch (period) {
        case 'Hour':
            return cohortRetention.date.format('MMM D, h A')
        case 'Month':
            return cohortRetention.date.format('MMM YYYY')
        case 'Week': {
            const startDate = cohortRetention.date
            const endDate = startDate.add(6, 'day')
            return `${startDate.format('MMM D')} to ${endDate.format('MMM D')}`
        }
        default:
            return cohortRetention.date.format('ddd, MMM D')
    }
}

export function getRetentionCellPeriodState(
    cohortDate: Dayjs,
    now: Dayjs,
    index: number,
    retentionFilter?: Pick<RetentionFilter, 'period' | 'retentionCustomBrackets'>
): { cellDate: Dayjs; isCurrentPeriod: boolean; isFuture: boolean } {
    const periodUnit = (retentionFilter?.period ?? RetentionPeriod.Day).toLowerCase() as UnitTypeLong
    const customBrackets = retentionFilter?.retentionCustomBrackets

    if (!customBrackets || index === 0 || index > customBrackets.length) {
        const cellDate = cohortDate.add(index, periodUnit)

        return {
            cellDate,
            isCurrentPeriod: cellDate.isSame(now, periodUnit),
            isFuture: cellDate.isAfter(now),
        }
    }

    const bracketSize = customBrackets[index - 1]
    const cellEndOffset = customBrackets.slice(0, index).reduce((total, value) => total + value, 0)
    const cellStartOffset = cellEndOffset - bracketSize + 1
    const cellDate = cohortDate.add(cellEndOffset, periodUnit)
    const cellStartDate = cohortDate.add(cellStartOffset, periodUnit)

    return {
        cellDate,
        isCurrentPeriod: !cellStartDate.isAfter(now) && cellDate.isAfter(now),
        isFuture: cellStartDate.isAfter(now),
    }
}
