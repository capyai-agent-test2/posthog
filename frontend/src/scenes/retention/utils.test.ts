import { dayjs } from 'lib/dayjs'

import { getRetentionCellPeriodState } from './utils'

describe('retention utils', () => {
    describe('getRetentionCellPeriodState', () => {
        const cohortDate = dayjs('2026-02-01T00:00:00Z')

        it('keeps started custom brackets visible until their full window closes', () => {
            const now = dayjs('2026-05-16T00:00:00Z')

            expect(
                getRetentionCellPeriodState(cohortDate, now, 4, {
                    period: 'Week',
                    retentionCustomBrackets: [1, 3, 4, 8],
                })
            ).toMatchObject({
                isCurrentPeriod: true,
                isFuture: false,
                cellDate: dayjs('2026-05-24T00:00:00Z'),
            })
        })

        it('hides custom brackets that have not started yet', () => {
            const now = dayjs('2026-03-15T00:00:00Z')

            expect(
                getRetentionCellPeriodState(cohortDate, now, 4, {
                    period: 'Week',
                    retentionCustomBrackets: [1, 3, 4, 8],
                })
            ).toMatchObject({
                isCurrentPeriod: false,
                isFuture: true,
                cellDate: dayjs('2026-05-24T00:00:00Z'),
            })
        })

        it('preserves existing behavior for non-bracket intervals', () => {
            const now = dayjs('2026-02-15T00:00:00Z')

            expect(
                getRetentionCellPeriodState(cohortDate, now, 2, {
                    period: 'Week',
                })
            ).toMatchObject({
                isCurrentPeriod: true,
                isFuture: false,
                cellDate: dayjs('2026-02-15T00:00:00Z'),
            })
        })
    })
})
