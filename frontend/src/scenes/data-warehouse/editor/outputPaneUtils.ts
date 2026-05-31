const RESULT_COLUMN_MIN_WIDTH = 120
const RESULT_COLUMN_MAX_WIDTH = 600
const RESULT_COLUMN_CHARACTER_WIDTH = 8
const RESULT_COLUMN_HORIZONTAL_PADDING = 48

export function getResultColumnWidth(maxContentLength: number): number {
    return Math.min(
        RESULT_COLUMN_MAX_WIDTH,
        Math.max(
            RESULT_COLUMN_MIN_WIDTH,
            Math.ceil(maxContentLength * RESULT_COLUMN_CHARACTER_WIDTH + RESULT_COLUMN_HORIZONTAL_PADDING)
        )
    )
}
