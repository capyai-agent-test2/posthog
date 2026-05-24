import { transformColumnsForExport } from '~/queries/nodes/DataTable/exportTransformers'

describe('exportTransformers', () => {
    it('casts person display name fallbacks to strings for current-column exports', () => {
        expect(transformColumnsForExport(['person'], ['name', 'Name', 'email'])).toEqual([
            'coalesce(toString(person.properties.name), toString(person.properties.Name), toString(person.properties.email), distinct_id) -- Person',
        ])
    })

    it('preserves existing person column labels after replacing the export expression', () => {
        expect(transformColumnsForExport(['person -- Respondent'], ['email'])).toEqual([
            'coalesce(toString(person.properties.email), distinct_id) -- Respondent',
        ])
    })
})
