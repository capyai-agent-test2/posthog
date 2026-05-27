import { useEffect, useMemo, useRef, useState } from 'react'

import { LemonInputSelect, SpinnerOverlay } from '@posthog/lemon-ui'

import { LineGraph } from '~/queries/nodes/DataVisualization/Components/Charts/LineGraph'
import { AxisSeries } from '~/queries/nodes/DataVisualization/dataVisualizationLogic'
import { ChartDisplayType } from '~/types'

import type { AppMetricsTimeSeriesResponse } from './appMetricsLogic'
import {
    filterAppMetricSeries,
    mergeNewSeriesIntoVisibleSeriesNames,
    syncVisibleSeriesNames,
} from './appMetricsSeriesFilter'

export type AppMetricsSeriesMetadata = Record<
    string,
    {
        label: string
        description?: string
        color?: string
    }
>

export function AppMetricsTrends({
    appMetricsTrends,
    loading,
    metricLabels,
    seriesMetadata,
    showSeriesFilter = false,
}: {
    appMetricsTrends: AppMetricsTimeSeriesResponse | null
    loading: boolean
    /** Optional display labels keyed by series name (e.g. `{ rows_synced: 'Rows synced' }`). */
    metricLabels?: Record<string, string>
    seriesMetadata?: AppMetricsSeriesMetadata
    showSeriesFilter?: boolean
}): JSX.Element {
    const allSeriesNames = useMemo(
        () => appMetricsTrends?.series.map((series) => series.name) ?? [],
        [appMetricsTrends]
    )
    const [visibleSeriesNames, setVisibleSeriesNames] = useState<string[] | null>(null)
    const everSeenSeriesNamesRef = useRef<string[]>([])

    useEffect(() => {
        const everSeenSeriesNames = everSeenSeriesNamesRef.current

        setVisibleSeriesNames((currentVisibleSeriesNames) => {
            if (currentVisibleSeriesNames === null) {
                return syncVisibleSeriesNames(currentVisibleSeriesNames, allSeriesNames)
            }

            return mergeNewSeriesIntoVisibleSeriesNames(currentVisibleSeriesNames, everSeenSeriesNames, allSeriesNames)
        })
        everSeenSeriesNamesRef.current = Array.from(new Set([...everSeenSeriesNames, ...allSeriesNames]))
    }, [allSeriesNames])

    const filteredAppMetricsTrends = useMemo(
        () => filterAppMetricSeries(appMetricsTrends, visibleSeriesNames ?? allSeriesNames),
        [appMetricsTrends, visibleSeriesNames, allSeriesNames]
    )

    const seriesOptions = useMemo(
        () =>
            allSeriesNames.map((seriesName) => {
                const metadata = seriesMetadata?.[seriesName]
                const label = metadata?.label ?? metricLabels?.[seriesName] ?? seriesName

                return {
                    key: seriesName,
                    value: seriesName,
                    label,
                    labelComponent: (
                        <div className="flex flex-col items-start py-0.5">
                            <span>{label}</span>
                            {metadata?.description ? (
                                <span className="text-xs text-secondary whitespace-normal">{metadata.description}</span>
                            ) : null}
                        </div>
                    ),
                }
            }),
        [allSeriesNames, metricLabels, seriesMetadata]
    )

    return (
        <div className="flex flex-col gap-2">
            {showSeriesFilter && seriesOptions.length > 1 ? (
                <div className="flex justify-end">
                    <LemonInputSelect
                        value={visibleSeriesNames ?? allSeriesNames}
                        onChange={setVisibleSeriesNames}
                        mode="multiple"
                        options={seriesOptions}
                        bulkActions="select-and-clear-all"
                        displayMode="count"
                        placeholder="All series"
                        title="Series"
                        data-attr="app-metrics-series-filter"
                    />
                </div>
            ) : null}
            <div className="relative border rounded min-h-[20rem] h-[70vh] bg-white">
                {loading ? (
                    <SpinnerOverlay />
                ) : !filteredAppMetricsTrends ? (
                    <div className="flex-1 flex items-center justify-center">Missing</div>
                ) : visibleSeriesNames?.length === 0 && allSeriesNames.length > 0 ? (
                    <div className="flex h-full items-center justify-center text-muted">Select at least one series</div>
                ) : (
                    <LineGraph
                        className="p-2"
                        xData={{
                            column: {
                                name: 'date',
                                type: {
                                    name: 'DATE',
                                    isNumerical: false,
                                },
                                label: 'Date',
                                dataIndex: 0,
                            },
                            data: filteredAppMetricsTrends.labels,
                        }}
                        yData={filteredAppMetricsTrends.series.map((x): AxisSeries<number | null> => {
                            const label = seriesMetadata?.[x.name]?.label ?? metricLabels?.[x.name] ?? x.name
                            return {
                                column: {
                                    name: label,
                                    type: { name: 'INTEGER', isNumerical: true },
                                    label,
                                    dataIndex: 0,
                                },
                                data: x.values,
                                settings: {
                                    display: {
                                        color: seriesMetadata?.[x.name]?.color,
                                    },
                                },
                            }
                        })}
                        visualizationType={ChartDisplayType.ActionsLineGraph}
                        chartSettings={{
                            showLegend: true,
                            showTotalRow: false,
                        }}
                    />
                )}
            </div>
        </div>
    )
}
