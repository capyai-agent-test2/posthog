import type { AppMetricsTimeSeriesResponse } from './appMetricsLogic'
import {
    filterAppMetricSeries,
    mergeNewSeriesIntoVisibleSeriesNames,
    syncVisibleSeriesNames,
} from './appMetricsSeriesFilter'

describe('appMetricsSeriesFilter', () => {
    const appMetricsTrends: AppMetricsTimeSeriesResponse = {
        labels: ['2026-01-01', '2026-01-02'],
        series: [
            { name: 'triggered', values: [1, 2] },
            { name: 'failed', values: [0, 1] },
            { name: 'succeeded', values: [1, 1] },
        ],
    }

    it('defaults visible series to all available series', () => {
        expect(syncVisibleSeriesNames(null, ['triggered', 'failed'])).toEqual(['triggered', 'failed'])
    })

    it('preserves selected series, drops missing ones, and adds newly available ones', () => {
        expect(syncVisibleSeriesNames(['failed', 'missing'], ['triggered', 'failed', 'succeeded'])).toEqual(['failed'])
    })

    it('adds only newly introduced series while keeping hidden ones hidden', () => {
        expect(
            mergeNewSeriesIntoVisibleSeriesNames(
                ['failed'],
                ['triggered', 'failed'],
                ['triggered', 'failed', 'succeeded']
            )
        ).toEqual(['failed', 'succeeded'])
    })

    it('filters the trends response to the selected series', () => {
        expect(filterAppMetricSeries(appMetricsTrends, ['succeeded', 'failed'])).toEqual({
            labels: ['2026-01-01', '2026-01-02'],
            series: [
                { name: 'failed', values: [0, 1] },
                { name: 'succeeded', values: [1, 1] },
            ],
        })
    })

    it('returns null when there is no data', () => {
        expect(filterAppMetricSeries(null, ['succeeded'])).toBeNull()
    })
})
