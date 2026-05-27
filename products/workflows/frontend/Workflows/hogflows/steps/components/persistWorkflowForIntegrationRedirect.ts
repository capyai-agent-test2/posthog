import { urls } from 'scenes/urls'

import { HogFunctionTemplateType } from '~/types'

import { sanitizeWorkflow } from '../../../workflowLogic'
import { HogFlow } from '../../types'

type PersistWorkflowRedirectParams = {
    workflow: HogFlow
    hogFunctionTemplatesById: Record<string, HogFunctionTemplateType>
    redirectUrl?: string
    currentTab?: string
    setWorkflowValues: (workflow: HogFlow) => void
    saveDraftWorkflow: (workflow: HogFlow) => Promise<HogFlow>
}

export async function persistWorkflowForIntegrationRedirect({
    workflow,
    hogFunctionTemplatesById,
    redirectUrl,
    currentTab,
    setWorkflowValues,
    saveDraftWorkflow,
}: PersistWorkflowRedirectParams): Promise<string | undefined> {
    if (!redirectUrl) {
        return redirectUrl
    }

    if (workflow.id && workflow.id !== 'new') {
        if (workflow.status === 'draft') {
            const savedWorkflow = await saveDraftWorkflow(sanitizeWorkflow({ ...workflow }, hogFunctionTemplatesById))
            setWorkflowValues(savedWorkflow)
        }
        return redirectUrl
    }

    const savedWorkflow = await saveDraftWorkflow(sanitizeWorkflow({ ...workflow }, hogFunctionTemplatesById))
    setWorkflowValues(savedWorkflow)

    const nextUrl = new URL(redirectUrl, window.location.origin)
    nextUrl.pathname = urls.workflow(savedWorkflow.id, currentTab || 'workflow')
    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
}
