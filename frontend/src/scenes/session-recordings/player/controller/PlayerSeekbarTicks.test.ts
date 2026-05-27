import { dayjs } from 'lib/dayjs'
import type {
    InspectorListItemComment,
    InspectorListItemEvent,
    InspectorListItemNotebookComment,
} from 'scenes/session-recordings/player/inspector/playerInspectorLogic'

import { getCommentStackIndexes } from './seekbarCommentStacking'

describe('getCommentStackIndexes', () => {
    const baseTimestamp = dayjs('2024-01-01T00:00:00Z')

    it('only stacks comment markers that share the same recording timestamp', () => {
        const items = [
            {
                type: 'comment',
                source: 'comment',
                key: 'comment-1',
                search: 'A comment',
                timestamp: baseTimestamp,
                timeInRecording: 1_000,
                data: { id: 'comment-1' },
            } as InspectorListItemComment,
            {
                type: 'comment',
                source: 'comment',
                key: 'comment-2',
                search: 'An emoji',
                timestamp: baseTimestamp,
                timeInRecording: 1_000,
                data: { id: 'comment-2' },
            } as InspectorListItemComment,
            {
                type: 'events',
                key: 'event-1',
                search: '$pageview',
                timestamp: baseTimestamp,
                timeInRecording: 1_000,
                data: { id: 'event-1', event: '$pageview' },
            } as InspectorListItemEvent,
            {
                type: 'comment',
                source: 'notebook',
                key: 'notebook-1',
                search: 'Notebook comment',
                timestamp: baseTimestamp,
                timeInRecording: 2_000,
                data: { id: 'notebook-1' },
            } as InspectorListItemNotebookComment,
        ]

        expect(getCommentStackIndexes(items)).toEqual({
            'comment-1': 0,
            'comment-2': 1,
            'notebook-1': 0,
        })
    })
})
