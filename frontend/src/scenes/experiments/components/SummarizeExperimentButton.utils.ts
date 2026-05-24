import { getDefaultMetricTitle } from 'scenes/experiments/MetricsView/shared/utils'

import type {
    CachedNewExperimentQueryResponse,
    ExperimentMetric,
    MaxExperimentMetricResult,
    MaxExperimentVariantResultBayesian,
    MaxExperimentVariantResultFrequentist,
} from '~/queries/schema/schema-general'
import { ExperimentMetricGoal } from '~/types'

export type OrderedMetricResult = {
    metric: ExperimentMetric
    result: CachedNewExperimentQueryResponse | null | undefined
    displayIndex: number
}

function getDeltaFromInterval(interval: [number, number] | number[] | undefined): number | null {
    if (!interval || interval.length < 2) {
        return null
    }
    return (interval[0] + interval[1]) / 2
}

export function getChanceToWinForSummary(
    chanceToWin: number | undefined,
    goal: ExperimentMetricGoal | 'increase' | 'decrease' | null | undefined
): number | null {
    if (chanceToWin === undefined) {
        return null
    }
    return goal === ExperimentMetricGoal.Decrease || goal === 'decrease' ? 1 - chanceToWin : chanceToWin
}

export function serializeMetricResultsForSummary(entries: OrderedMetricResult[]): MaxExperimentMetricResult[] {
    return entries.flatMap(({ metric, result, displayIndex }) => {
        if (!result?.variant_results?.length) {
            return []
        }

        const metricName = metric.name || getDefaultMetricTitle(metric)
        const goal = ('goal' in metric ? metric.goal : null) || null
        const variantResults = result.variant_results.map((variant) => {
            if ('chance_to_win' in variant) {
                return {
                    key: variant.key,
                    chance_to_win: getChanceToWinForSummary(variant.chance_to_win, goal),
                    credible_interval: variant.credible_interval || null,
                    delta: getDeltaFromInterval(variant.credible_interval),
                    significant: variant.significant ?? false,
                } satisfies MaxExperimentVariantResultBayesian
            }

            return {
                key: variant.key,
                p_value: variant.p_value ?? null,
                confidence_interval: variant.confidence_interval || null,
                delta: getDeltaFromInterval(variant.confidence_interval),
                significant: variant.significant ?? false,
            } satisfies MaxExperimentVariantResultFrequentist
        })

        return [
            {
                name: `${displayIndex + 1}. ${metricName}`,
                goal,
                variant_results: variantResults,
            } satisfies MaxExperimentMetricResult,
        ]
    })
}
