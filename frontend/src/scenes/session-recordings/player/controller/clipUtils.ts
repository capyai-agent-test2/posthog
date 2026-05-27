export interface ClipTimeBounds {
    currentSeconds: number
    startSeconds: number
    endSeconds: number
}

export function getClipTimeBounds(
    currentTimeMs: number | null,
    sessionDurationMs: number,
    clipDurationSeconds: number
): ClipTimeBounds {
    const currentSeconds = Math.max(0, Math.floor((currentTimeMs ?? 0) / 1000))
    const sessionDurationSeconds = Math.max(0, Math.floor(sessionDurationMs / 1000))
    const maxStartSeconds = Math.max(0, sessionDurationSeconds - clipDurationSeconds)
    const startSeconds = Math.min(maxStartSeconds, Math.max(0, Math.floor(currentSeconds - clipDurationSeconds / 2)))
    const endSeconds = Math.min(sessionDurationSeconds, startSeconds + clipDurationSeconds)

    return { currentSeconds, startSeconds, endSeconds }
}
