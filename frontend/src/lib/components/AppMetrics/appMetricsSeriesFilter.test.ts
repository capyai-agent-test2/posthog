import type { AppMetricsTimeSeriesResponse } from './appMetricsLogic'
import {
    filterAppMetricSeries,
    mergeNewSeriesIntoVisibleSeriesNames,
    reconcileVisibleSeriesNames,
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

    it('does not re-add a previously seen hidden series after it transiently disappears', () => {
        expect(
            mergeNewSeriesIntoVisibleSeriesNames(
                ['failed'],
                ['triggered', 'failed', 'succeeded'],
                ['triggered', 'failed', 'succeeded']
            )
        ).toEqual(['failed'])
    })

    it('keeps the current selection intact across transient empty responses', () => {
        expect(reconcileVisibleSeriesNames(['failed', 'succeeded'], ['failed', 'succeeded'], [])).toEqual([
            'failed',
            'succeeded',
        ])
    })

    it('keeps previously visible series selected when they are temporarily absent', () => {
        expect(
            mergeNewSeriesIntoVisibleSeriesNames(['failed', 'succeeded'], ['failed', 'succeeded'], ['failed'])
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
