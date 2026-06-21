import { getSharedVariablesOverrideUrl } from './sharedVariablesOverride'

describe('variablesLogic shared view overrides', () => {
    it('sets variables_override on the shared URL', () => {
        const url = getSharedVariablesOverrideUrl(
            [
                {
                    variableId: '17',
                    code_name: 'date_from',
                    value: '2025-10-01',
                },
            ],
            'https://example.com/shared/token?embedded=1'
        )

        const parsed = new URL(url)
        expect(parsed.searchParams.get('embedded')).toBe('1')
        expect(JSON.parse(parsed.searchParams.get('variables_override') || '{}')).toEqual({
            '17': {
                variableId: '17',
                code_name: 'date_from',
                value: '2025-10-01',
            },
        })
    })

    it('removes variables_override when no variables remain', () => {
        const url = getSharedVariablesOverrideUrl(
            [],
            'https://example.com/shared/token?variables_override=%7B%7D&foo=bar'
        )

        const parsed = new URL(url)
        expect(parsed.searchParams.get('foo')).toBe('bar')
        expect(parsed.searchParams.has('variables_override')).toBe(false)
    })
})
