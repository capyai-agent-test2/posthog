import type { AppMetricsTimeSeriesResponse } from './appMetricsLogic'

export function syncVisibleSeriesNames(
    previousVisibleSeriesNames: string[] | null,
    allSeriesNames: string[]
): string[] {
    if (previousVisibleSeriesNames === null) {
        return allSeriesNames
    }

    const existingSeries = previousVisibleSeriesNames.filter((name) => allSeriesNames.includes(name))
    const addedSeries = allSeriesNames.filter((name) => !previousVisibleSeriesNames.includes(name))

    return [...existingSeries, ...addedSeries]
}

export function filterAppMetricSeries(
    appMetricsTrends: AppMetricsTimeSeriesResponse | null,
    visibleSeriesNames: string[]
): AppMetricsTimeSeriesResponse | null {
    if (!appMetricsTrends) {
        return null
    }

    const visibleSeriesNameSet = new Set(visibleSeriesNames)

    return {
        ...appMetricsTrends,
        series: appMetricsTrends.series.filter((series) => visibleSeriesNameSet.has(series.name)),
    }
}
