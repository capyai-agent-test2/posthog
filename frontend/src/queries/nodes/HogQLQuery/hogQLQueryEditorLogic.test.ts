import { shouldSyncQueryInputFromProps } from './hogQLQueryEditorLogic'

describe('hogQLQueryEditorLogic', () => {
    it('does not replace local SQL edits when only the editor instance changes', () => {
        expect(shouldSyncQueryInputFromProps('select 2', 'select 1', 'select 1', true)).toBe(false)
    })

    it('syncs local SQL input when the query prop changes', () => {
        expect(shouldSyncQueryInputFromProps('select 2', 'select 1', 'select 3', false)).toBe(true)
    })

    it('syncs local SQL input when a clean editor instance changes', () => {
        expect(shouldSyncQueryInputFromProps('select 1', 'select 1', 'select 1', true)).toBe(true)
    })
})
