import { useMemo } from 'react'

import { Chart } from 'lib/Chart'

export interface AnnotationsPositioning {
    tickIntervalPx: number
    firstTickLeftPx: number
    /** Pixel x of a data point by index, or null if the chart isn't ready / index is out of range. */
    getDataPointX: (dataIndex: number) => number | null
}

export function useAnnotationsPositioning(
    chart: Chart | undefined,
    chartWidth: number,
    chartHeight: number,
    datasetIndex = 0
): AnnotationsPositioning {
    // Calculate chart content coordinates for annotations overlay positioning
    return useMemo<AnnotationsPositioning>(() => {
        // @ts-expect-error - _metasets is not officially exposed
        const metasets = chart?._metasets as PointMetaset[] | undefined
        const points = metasets?.[datasetIndex]?.data ?? metasets?.[0]?.data ?? null

        if (points && points.length > 1) {
            const firstTickLeftPx = points[0]?.x ?? 0
            const lastTickLeftPx = points[points.length - 1]?.x ?? 0
            return {
                tickIntervalPx: (lastTickLeftPx - firstTickLeftPx) / (points.length - 1),
                firstTickLeftPx,
                getDataPointX: (dataIndex: number) => {
                    const point = points[dataIndex]
                    return point ? point.x : null
                },
            }
        }
        return {
            tickIntervalPx: 0,
            firstTickLeftPx: 0,
            getDataPointX: () => null,
        }
    }, [chart, chartWidth, chartHeight, datasetIndex])
}
