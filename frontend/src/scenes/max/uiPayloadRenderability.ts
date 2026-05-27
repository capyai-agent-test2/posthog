import type { AssistantTool } from '~/queries/schema/schema-assistant-messages'

import { isDangerousOperationResponse } from './approvalOperationUtils'

export const RENDERABLE_UI_PAYLOAD_TOOLS: AssistantTool[] = [
    'search_session_recordings',
    'search_error_tracking_issues',
    'summarize_sessions',
    'create_form',
]

export function isRenderableUIPayloadTool(toolName: string, toolPayload: unknown): boolean {
    return (
        (RENDERABLE_UI_PAYLOAD_TOOLS as readonly string[]).includes(toolName) ||
        isDangerousOperationResponse(toolPayload)
    )
}
