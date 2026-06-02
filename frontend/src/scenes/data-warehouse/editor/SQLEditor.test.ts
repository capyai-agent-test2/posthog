import { SQLEditorMode, defaultShowDatabaseTreeForMode } from './sqlEditorModes'

describe('defaultShowDatabaseTreeForMode', () => {
    it('shows the database tree by default only for the full SQL editor scene', () => {
        expect(defaultShowDatabaseTreeForMode(SQLEditorMode.FullScene)).toBe(true)
        expect(defaultShowDatabaseTreeForMode(SQLEditorMode.Embedded)).toBe(false)
    })

    it('respects an explicit default database tree setting', () => {
        expect(defaultShowDatabaseTreeForMode(SQLEditorMode.FullScene, false)).toBe(false)
        expect(defaultShowDatabaseTreeForMode(SQLEditorMode.Embedded, true)).toBe(true)
    })
})
