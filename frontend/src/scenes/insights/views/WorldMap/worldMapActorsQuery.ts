import { datasetToActorsQuery } from 'scenes/trends/viz/datasetToActorsQuery'

import type { InsightActorsQuery } from '~/queries/schema/schema-general'
import type { TrendResult } from '~/types'

export function worldMapSeriesToActorsQuery(
    countrySeries: TrendResult,
    querySource: InsightActorsQuery['source']
): InsightActorsQuery {
    return datasetToActorsQuery({ dataset: countrySeries, query: querySource })
}
