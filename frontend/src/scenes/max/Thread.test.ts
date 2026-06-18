import { AssistantMessageType } from '~/queries/schema/schema-assistant-messages'

import type { ThreadMessage } from './maxThreadLogic'
import { getVisibleThreadItems } from './threadVisibility'

describe('getVisibleThreadItems', () => {
    it('keeps repeated human prompts visible after a failed attempt', () => {
        const thread: ThreadMessage[] = [
            {
                type: AssistantMessageType.Human,
                content: 'Why did this happen?',
                status: 'completed',
                trace_id: 'trace-1',
            },
            {
                type: AssistantMessageType.Failure,
                content: 'Temporary failure',
                status: 'completed',
                id: 'failure-1',
            },
            {
                type: AssistantMessageType.Human,
                content: 'Why did this happen?',
                status: 'completed',
                trace_id: 'trace-2',
            },
            {
                type: AssistantMessageType.Assistant,
                content: 'You already asked that.',
                status: 'completed',
                id: 'assistant-1',
            },
        ]

        expect(getVisibleThreadItems(thread, false).map(({ message }) => message)).toEqual(thread)
    })

    it('hides only the failure bubble while a retry is still loading', () => {
        const thread: ThreadMessage[] = [
            {
                type: AssistantMessageType.Human,
                content: 'Why did this happen?',
                status: 'completed',
                trace_id: 'trace-1',
            },
            {
                type: AssistantMessageType.Failure,
                content: 'Temporary failure',
                status: 'completed',
                id: 'failure-1',
            },
            {
                type: AssistantMessageType.Human,
                content: 'Why did this happen?',
                status: 'completed',
                trace_id: 'trace-2',
            },
        ]

        expect(getVisibleThreadItems(thread, true).map(({ message }) => message)).toEqual([thread[0], thread[2]])
    })
})
