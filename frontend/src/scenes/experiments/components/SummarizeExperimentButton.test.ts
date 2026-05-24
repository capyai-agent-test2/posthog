import type { CachedNewExperimentQueryResponse, ExperimentMetric } from '~/queries/schema/schema-general'
import { ExperimentMetricType, NodeKind } from '~/queries/schema/schema-general'
import { ExperimentMetricGoal } from '~/types'

import { getChanceToWinForSummary, serializeMetricResultsForSummary } from './SummarizeExperimentButton.utils'

describe('SummarizeExperimentButton helpers', () => {
    it('inverts chance to win for decrease goals', () => {
        expect(getChanceToWinForSummary(0.8, ExperimentMetricGoal.Decrease)).toBeCloseTo(0.2)
    })

    it('serializes bayesian metric results from the frontend context', () => {
        const metric: ExperimentMetric = {
            kind: NodeKind.ExperimentMetric,
            metric_type: ExperimentMetricType.MEAN,
            name: 'Signup conversion',
            goal: ExperimentMetricGoal.Decrease,
            source: {
                kind: NodeKind.EventsNode,
                event: 'signup',
            },
        }

        const result: CachedNewExperimentQueryResponse = {
            baseline: {
                key: 'control',
                sum: 100,
                number_of_samples: 1000,
                sum_squares: 10000,
            },
            variant_results: [
                {
                    key: 'variant-a',
                    method: 'bayesian',
                    sum: 80,
                    number_of_samples: 1000,
                    sum_squares: 6400,
                    chance_to_win: 0.9,
                    credible_interval: [-0.3, -0.1],
                    significant: true,
                },
            ],
        }

        const [summary] = serializeMetricResultsForSummary([{ metric, result, displayIndex: 0 }])

        expect(summary.name).toBe('1. Signup conversion')
        expect(summary.goal).toBe('decrease')
        expect(summary.variant_results).toEqual([
            expect.objectContaining({
                key: 'variant-a',
                credible_interval: [-0.3, -0.1],
                delta: -0.2,
                significant: true,
            }),
        ])
        expect('chance_to_win' in summary.variant_results[0] && summary.variant_results[0].chance_to_win).toBeCloseTo(
            0.1
        )
    })

    it('serializes frequentist metric results from the frontend context', () => {
        const metric: ExperimentMetric = {
            kind: NodeKind.ExperimentMetric,
            metric_type: ExperimentMetricType.MEAN,
            source: {
                kind: NodeKind.EventsNode,
                event: 'purchase',
            },
        }

        const result: CachedNewExperimentQueryResponse = {
            baseline: {
                key: 'control',
                sum: 100,
                number_of_samples: 1000,
                sum_squares: 10000,
            },
            variant_results: [
                {
                    key: 'variant-b',
                    method: 'frequentist',
                    sum: 120,
                    number_of_samples: 1000,
                    sum_squares: 14400,
                    p_value: 0.04,
                    confidence_interval: [0.05, 0.15],
                    significant: true,
                },
            ],
        }

        expect(serializeMetricResultsForSummary([{ metric, result, displayIndex: 1 }])).toEqual([
            {
                name: '2. purchase',
                goal: null,
                variant_results: [
                    {
                        key: 'variant-b',
                        p_value: 0.04,
                        confidence_interval: [0.05, 0.15],
                        delta: 0.1,
                        significant: true,
                    },
                ],
            },
        ])
    })
})
