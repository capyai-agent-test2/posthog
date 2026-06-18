import type {
    InspectorListItemComment,
    InspectorListItemEvent,
    InspectorListItemNotebookComment,
} from 'scenes/session-recordings/player/inspector/playerInspectorLogic'

type SeekbarItem = InspectorListItemEvent | InspectorListItemComment | InspectorListItemNotebookComment

function isAnyComment(item: SeekbarItem): item is InspectorListItemComment | InspectorListItemNotebookComment {
    return item.type === 'comment'
}

export function getCommentStackIndexes(seekbarItems: SeekbarItem[]): Record<string, number> {
    const stackIndexesById: Record<string, number> = {}
    const nextStackIndexByTimestamp = new Map<number, number>()

    for (const item of seekbarItems) {
        if (!isAnyComment(item)) {
            continue
        }

        const stackIndex = nextStackIndexByTimestamp.get(item.timeInRecording) ?? 0
        stackIndexesById[String(item.data.id)] = stackIndex
        nextStackIndexByTimestamp.set(item.timeInRecording, stackIndex + 1)
    }

    return stackIndexesById
}
