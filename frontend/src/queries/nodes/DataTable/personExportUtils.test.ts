import { ActorsQuery, NodeKind } from '~/queries/schema/schema-general'

import { getExportSourceForActorsQuery, isPersonActorsQuery } from './personExportUtils'

describe('personExportUtils', () => {
    const personActorsQuery: ActorsQuery = {
        kind: NodeKind.ActorsQuery,
        search: 'alice',
        properties: [{ key: 'email', type: 'person', value: 'is_set', operator: 'is_set' }],
        select: ['person_display_name -- Person', 'id'],
    }

    it('detects top-level person actors queries', () => {
        expect(isPersonActorsQuery(personActorsQuery)).toBe(true)
        expect(
            isPersonActorsQuery({ ...personActorsQuery, source: { kind: NodeKind.HogQLQuery, query: 'select 1' } })
        ).toBe(false)
    })

    it('switches export-all actor queries to star selection', () => {
        expect(getExportSourceForActorsQuery(personActorsQuery, false)).toEqual({
            ...personActorsQuery,
            orderBy: ['id ASC'],
            select: ['*'],
        })
    })

    it('keeps selected columns for current-column exports', () => {
        expect(getExportSourceForActorsQuery(personActorsQuery, true)).toEqual(personActorsQuery)
    })

    it('preserves created_at ordering when that column is visible', () => {
        expect(
            getExportSourceForActorsQuery(
                { ...personActorsQuery, select: ['person_display_name -- Person', 'created_at'] },
                false
            )
        ).toEqual({
            ...personActorsQuery,
            orderBy: ['created_at DESC'],
            select: ['*'],
        })
    })
})
