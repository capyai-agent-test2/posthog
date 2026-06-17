import { MOCK_TEAM_ID } from 'lib/api.mock'

import { ApiConfig } from 'lib/api'

import { ActorsQuery, NodeKind } from '~/queries/schema/schema-general'

import { getPersonActorsExportPath, isPersonActorsQuery, shouldUsePersonActorsExportPath } from './personExportUtils'

describe('personExportUtils', () => {
    beforeEach(() => {
        ApiConfig.setCurrentTeamId(MOCK_TEAM_ID)
    })

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

    it('only uses the persons endpoint for export-all', () => {
        expect(shouldUsePersonActorsExportPath(personActorsQuery, false)).toBe(true)
        expect(shouldUsePersonActorsExportPath(personActorsQuery, true)).toBe(false)
    })

    it('builds a persons endpoint path for top-level person actors queries', () => {
        const exportPath = getPersonActorsExportPath(personActorsQuery)
        expect(exportPath).toContain(`api/environments/${MOCK_TEAM_ID}/persons?`)
        expect(exportPath).toContain('search=alice')
        expect(exportPath).toContain('properties=')
    })

    it('uses the cohort persons endpoint when the query is scoped to a cohort', () => {
        expect(
            getPersonActorsExportPath({
                ...personActorsQuery,
                fixedProperties: [{ type: 'cohort', key: 'id', value: 7 }],
            })
        ).toContain('/api/cohort/7/persons?')
    })

    it('keeps cohort exclusion filters on the persons endpoint', () => {
        const exportPath = getPersonActorsExportPath({
            ...personActorsQuery,
            fixedProperties: [{ type: 'cohort', key: 'id', value: 7, operator: 'not_in' }],
        })
        expect(exportPath).toContain(`api/environments/${MOCK_TEAM_ID}/persons?`)
        expect(exportPath).toContain('not_in')
    })
})
