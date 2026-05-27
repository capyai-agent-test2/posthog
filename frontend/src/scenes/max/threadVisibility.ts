import { AssistantMessageType } from '~/queries/schema/schema-assistant-messages'

import { isDangerousOperationResponse } from './approvalOperationUtils'
import type { ThreadMessage } from './maxThreadLogic'
import { isAssistantToolCallMessage } from './utils'

export interface VisibleThreadItem {
    message: ThreadMessage
    originalIndex: number
    currentTraceId?: string
}

function isErrorMessage(message: ThreadMessage): boolean {
    return message.type !== 'human' && (message.status === 'error' || message.type === AssistantMessageType.Failure)
}

function isRenderableUIPayloadTool(toolName: string, toolPayload: unknown): boolean {
    return (
        ['search_session_recordings', 'search_error_tracking_issues', 'summarize_sessions', 'create_form'].includes(
            toolName
        ) || isDangerousOperationResponse(toolPayload)
    )
}

export function getVisibleThreadItems(threadGrouped: ThreadMessage[], threadLoading: boolean): VisibleThreadItem[] {
    let currentTraceId: string | undefined
    const visibleItems: VisibleThreadItem[] = []

    for (let index = 0; index < threadGrouped.length; index++) {
        const message = threadGrouped[index]

        if (message.type === 'human' && 'trace_id' in message && message.trace_id) {
            currentTraceId = message.trace_id
        }

        if (threadLoading && isErrorMessage(message)) {
            continue
        }

        if (isErrorMessage(message)) {
            const hasNewerError = threadGrouped.slice(index + 1).some(isErrorMessage)
            if (hasNewerError) {
                continue
            }
        }

        if (
            isAssistantToolCallMessage(message) &&
            (!message.ui_payload || !isRenderableUIPayloadTool(Object.keys(message.ui_payload)[0], message.ui_payload))
        ) {
            continue
        }

        visibleItems.push({
            message,
            originalIndex: index,
            currentTraceId: message.type !== 'human' ? currentTraceId : undefined,
        })
    }

    return visibleItems
}
