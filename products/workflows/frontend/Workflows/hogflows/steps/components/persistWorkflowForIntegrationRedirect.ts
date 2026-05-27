import { urls } from 'scenes/urls'

import { HogFunctionTemplateType } from '~/types'

import { sanitizeWorkflow } from '../../../workflowLogic'
import { HogFlow, HogFlowSchedule } from '../../types'

type PendingSchedule = { rrule: string; starts_at: string; timezone?: string } | null | false

type PersistWorkflowRedirectParams = {
    workflow: HogFlow
    hogFunctionTemplatesById: Record<string, HogFunctionTemplateType>
    redirectUrl?: string
    currentTab?: string
    shouldSaveDraft?: boolean
    pendingSchedule?: PendingSchedule
    currentSchedule?: HogFlowSchedule | null
    setWorkflowValues: (workflow: HogFlow) => void
    saveDraftWorkflow: (workflow: HogFlow) => Promise<HogFlow>
    savePendingSchedule?: (
        workflowId: string,
        pendingSchedule: PendingSchedule,
        currentSchedule?: HogFlowSchedule | null
    ) => Promise<void>
}

export async function persistWorkflowForIntegrationRedirect({
    workflow,
    hogFunctionTemplatesById,
    redirectUrl,
    currentTab,
    shouldSaveDraft = true,
    pendingSchedule = false,
    currentSchedule,
    setWorkflowValues,
    saveDraftWorkflow,
    savePendingSchedule,
}: PersistWorkflowRedirectParams): Promise<string | undefined> {
    if (!redirectUrl) {
        return redirectUrl
    }

    if (!shouldSaveDraft) {
        return redirectUrl
    }

    if (workflow.id && workflow.id !== 'new') {
        if (workflow.status === 'draft') {
            const savedWorkflow = await saveDraftWorkflow(sanitizeWorkflow({ ...workflow }, hogFunctionTemplatesById))
            setWorkflowValues(savedWorkflow)
            if (pendingSchedule !== false && savePendingSchedule) {
                await savePendingSchedule(savedWorkflow.id, pendingSchedule, currentSchedule)
            }
        }
        return redirectUrl
    }

    const savedWorkflow = await saveDraftWorkflow(sanitizeWorkflow({ ...workflow }, hogFunctionTemplatesById))
    setWorkflowValues(savedWorkflow)
    if (pendingSchedule !== false && savePendingSchedule) {
        await savePendingSchedule(savedWorkflow.id, pendingSchedule, currentSchedule)
    }

    const nextUrl = new URL(redirectUrl, window.location.origin)
    nextUrl.pathname = urls.workflow(savedWorkflow.id, currentTab || 'workflow')
    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
}
