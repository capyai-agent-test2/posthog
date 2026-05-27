import type { AppMetricsTimeSeriesResponse } from './appMetricsLogic'

export function syncVisibleSeriesNames(
    previousVisibleSeriesNames: string[] | null,
    allSeriesNames: string[]
): string[] {
    if (previousVisibleSeriesNames === null) {
        return allSeriesNames
    }

    return previousVisibleSeriesNames.filter((name) => allSeriesNames.includes(name))
}

export function mergeNewSeriesIntoVisibleSeriesNames(
    previousVisibleSeriesNames: string[],
    everSeenSeriesNames: string[],
    allSeriesNames: string[]
): string[] {
    const existingSeries = previousVisibleSeriesNames.filter((name) => allSeriesNames.includes(name))
    const addedSeries = allSeriesNames.filter((name) => !everSeenSeriesNames.includes(name))

    return [...existingSeries, ...addedSeries]
}

export function reconcileVisibleSeriesNames(
    previousVisibleSeriesNames: string[] | null,
    everSeenSeriesNames: string[],
    allSeriesNames: string[]
): string[] {
    if (previousVisibleSeriesNames === null) {
        return syncVisibleSeriesNames(previousVisibleSeriesNames, allSeriesNames)
    }

    if (allSeriesNames.length === 0) {
        return previousVisibleSeriesNames
    }

    return mergeNewSeriesIntoVisibleSeriesNames(previousVisibleSeriesNames, everSeenSeriesNames, allSeriesNames)
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
