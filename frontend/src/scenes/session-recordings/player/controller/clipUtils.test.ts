import { getClipTimeBounds } from './clipUtils'

describe('getClipTimeBounds', () => {
    it.each([
        {
            description: 'centers a clip in the middle of a recording',
            currentTimeMs: 20_000,
            sessionDurationMs: 60_000,
            clipDurationSeconds: 10,
            expected: { currentSeconds: 20, startSeconds: 15, endSeconds: 25 },
        },
        {
            description: 'clamps to the beginning of a recording',
            currentTimeMs: 1_000,
            sessionDurationMs: 60_000,
            clipDurationSeconds: 5,
            expected: { currentSeconds: 1, startSeconds: 0, endSeconds: 5 },
        },
        {
            description: 'clamps to the end of a recording',
            currentTimeMs: 58_000,
            sessionDurationMs: 60_000,
            clipDurationSeconds: 5,
            expected: { currentSeconds: 58, startSeconds: 55, endSeconds: 60 },
        },
        {
            description: 'keeps odd-duration clips aligned with the shown bounds',
            currentTimeMs: 20_000,
            sessionDurationMs: 60_000,
            clipDurationSeconds: 15,
            expected: { currentSeconds: 20, startSeconds: 12, endSeconds: 27 },
        },
    ])('$description', ({ currentTimeMs, sessionDurationMs, clipDurationSeconds, expected }) => {
        expect(getClipTimeBounds(currentTimeMs, sessionDurationMs, clipDurationSeconds)).toEqual(expected)
    })
})
