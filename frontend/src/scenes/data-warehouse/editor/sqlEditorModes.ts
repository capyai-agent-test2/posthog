export enum SQLEditorMode {
    FullScene = 'full_scene',
    Embedded = 'embedded',
}

export const isEmbeddedSQLEditorMode = (mode: SQLEditorMode): boolean => mode === SQLEditorMode.Embedded

export const defaultShowDatabaseTreeForMode = (mode: SQLEditorMode, defaultShowDatabaseTree?: boolean): boolean =>
    defaultShowDatabaseTree ?? mode === SQLEditorMode.FullScene
