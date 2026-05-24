import { useActions, useValues } from 'kea'
import posthog from 'posthog-js'
import { useMemo } from 'react'

import { IconAI } from '@posthog/icons'

import { LemonButton } from 'lib/lemon-ui/LemonButton'
import { addProductIntent } from 'lib/utils/product-intents'
import { useMaxTool } from 'scenes/max/useMaxTool'

import { iconForType } from '~/layout/panel-layout/ProjectTree/defaultTree'
import type { MaxExperimentMetricResult } from '~/queries/schema/schema-general'
import { ProductIntentContext, ProductKey } from '~/queries/schema/schema-general'

import { experimentLogic } from '../experimentLogic'
import { isLaunched } from '../experimentsLogic'
import { serializeMetricResultsForSummary } from './SummarizeExperimentButton.utils'

/**
 * Minimal context sent to the backend for experiment summarization.
 * The backend fetches all detailed experiment data using the experiment_id.
 * This has the benefit that the AI can be called from other places too.
 */
interface MinimalExperimentSummaryContext {
    experiment_id: number | string
    experiment_name: string
    exposures: Record<string, number> | null
    primary_metrics_results: MaxExperimentMetricResult[]
    secondary_metrics_results: MaxExperimentMetricResult[]
    /** ISO8601 timestamp of when the frontend last refreshed the data */
    frontend_last_refresh: string | null
}

function useExperimentSummaryMaxTool(): ReturnType<typeof useMaxTool> {
    const {
        experiment,
        exposures,
        orderedPrimaryMetricsWithResults,
        orderedSecondaryMetricsWithResults,
        primaryMetricsResults,
        secondaryMetricsResults,
    } = useValues(experimentLogic)

    // Get the most recent last_refresh timestamp from metric results
    const frontendLastRefresh = useMemo(() => {
        const allResults = [...(primaryMetricsResults || []), ...(secondaryMetricsResults || [])]
        const timestamps = allResults
            .map((r) => r?.last_refresh)
            .filter((t): t is string => typeof t === 'string')
            .sort()
            .reverse()
        return timestamps[0] || null
    }, [primaryMetricsResults, secondaryMetricsResults])

    const primaryMetricsForSummary = useMemo(
        () => serializeMetricResultsForSummary(orderedPrimaryMetricsWithResults),
        [orderedPrimaryMetricsWithResults]
    )
    const secondaryMetricsForSummary = useMemo(
        () => serializeMetricResultsForSummary(orderedSecondaryMetricsWithResults),
        [orderedSecondaryMetricsWithResults]
    )

    const maxToolContext = useMemo(
        (): MinimalExperimentSummaryContext => ({
            experiment_id: experiment.id,
            experiment_name: experiment.name || 'Unnamed experiment',
            exposures: exposures?.total_exposures || null,
            primary_metrics_results: primaryMetricsForSummary,
            secondary_metrics_results: secondaryMetricsForSummary,
            frontend_last_refresh: frontendLastRefresh,
        }),
        [
            experiment.id,
            experiment.name,
            exposures?.total_exposures,
            primaryMetricsForSummary,
            secondaryMetricsForSummary,
            frontendLastRefresh,
        ]
    )

    const shouldShowMaxSummaryTool = useMemo(() => {
        const hasResults = primaryMetricsForSummary.length > 0 || secondaryMetricsForSummary.length > 0
        const hasStarted = isLaunched(experiment)
        return hasResults && hasStarted
    }, [primaryMetricsForSummary.length, secondaryMetricsForSummary.length, experiment])

    const maxToolResult = useMaxTool({
        identifier: 'experiment_results_summary',
        context: maxToolContext,
        contextDescription: {
            text: maxToolContext.experiment_name,
            icon: iconForType('experiment'),
        },
        active: shouldShowMaxSummaryTool,
        initialMaxPrompt: `!Summarize the experiment "${experiment.name}"`,
        callback(toolOutput) {
            addProductIntent({
                product_type: ProductKey.EXPERIMENTS,
                intent_context: ProductIntentContext.EXPERIMENT_ANALYZED,
                metadata: {
                    experiment_id: experiment.id,
                },
            })

            if (toolOutput?.error) {
                posthog.captureException(toolOutput?.error || 'Undefined error when summarizing experiment with Max', {
                    action: 'max-ai-experiment-summary-failed',
                    experiment_id: experiment.id,
                    ...toolOutput,
                })
            }
        },
    })

    return maxToolResult
}

export function SummarizeExperimentButton({ disabledReason }: { disabledReason?: string }): JSX.Element | null {
    const { openMax } = useExperimentSummaryMaxTool()
    const { experiment } = useValues(experimentLogic)
    const { reportExperimentAiSummaryRequested } = useActions(experimentLogic)
    if (!openMax) {
        return null
    }

    return (
        <LemonButton
            size="small"
            onClick={() => {
                reportExperimentAiSummaryRequested(experiment)
                openMax()
            }}
            type="secondary"
            icon={<IconAI />}
            disabledReason={disabledReason}
        >
            Summarize results
        </LemonButton>
    )
}
