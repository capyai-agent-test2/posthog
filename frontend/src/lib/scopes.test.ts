import fs from 'fs'
import path from 'path'

import { API_KEY_SCOPE_PRESETS, API_SCOPES } from 'lib/scopes'

describe('API_KEY_SCOPE_PRESETS', () => {
    const findPreset = (value: string): (typeof API_KEY_SCOPE_PRESETS)[number] => {
        const preset = API_KEY_SCOPE_PRESETS.find((p) => p.value === value)
        if (!preset) {
            throw new Error(`Preset "${value}" not found`)
        }
        return preset
    }

    describe('read_only_access', () => {
        it('exists with the expected label', () => {
            const preset = findPreset('read_only_access')
            expect(preset.label).toBe('Read-only access')
        })

        it('contains :read for every entry in API_SCOPES', () => {
            const preset = findPreset('read_only_access')
            const expected = API_SCOPES.map(({ key }) => `${key}:read`).sort()
            expect([...preset.scopes].sort()).toEqual(expected)
        })
    })

    describe('all_access', () => {
        it('still uses the wildcard scope', () => {
            const preset = findPreset('all_access')
            expect(preset.scopes).toEqual(['*'])
        })
    })
})

describe('API_SCOPES', () => {
    it('stays in sync with backend scope objects except internal-only entries', () => {
        const scopesPy = fs.readFileSync(path.resolve(process.cwd(), 'posthog/scopes.py'), 'utf-8')
        const internalScopeMatch = scopesPy.match(/INTERNAL_API_SCOPE_OBJECTS:\s+frozenset\[APIScopeObject\]\s+=\s+frozenset\(\{([^}]*)\}\)/s)
        const internalScopes = new Set(
            [...(internalScopeMatch?.[1].matchAll(/"([^"]+)"/g) ?? [])].map((match) => match[1])
        )
        const backendScopeBlock = scopesPy.match(/APIScopeObject = Literal\[(.*?)\n\]/s)
        const backendScopes = new Set(
            [...(backendScopeBlock?.[1].matchAll(/"([^"]+)"/g) ?? [])]
                .map((match) => match[1])
                .filter((scope) => !internalScopes.has(scope))
        )

        expect([...backendScopes].sort()).toEqual(API_SCOPES.map(({ key }) => key).sort())
    })
})
