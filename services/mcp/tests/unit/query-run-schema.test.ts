import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js'
import { describe, expect, it } from 'vitest'

import { QueryRunInputSchema } from '@/schema/tool-inputs'

describe('QueryRunInputSchema', () => {
    it('accepts a bare HogQLQuery node', () => {
        const result = QueryRunInputSchema.safeParse({
            query: {
                kind: 'HogQLQuery',
                query: 'SELECT count() AS total FROM system.insight_variables',
            },
        })

        expect(result.success).toBe(true)
    })

    it('emits a Gemini-safe object schema instead of a discriminated union', () => {
        const schema = toJsonSchemaCompat(QueryRunInputSchema, { strictUnions: true }) as {
            properties?: { query?: Record<string, unknown> }
        }

        expect(schema.properties?.query).toMatchObject({ type: 'object' })
        expect(schema.properties?.query).not.toHaveProperty('oneOf')
        expect(schema.properties?.query?.description).toContain('HogQLQuery')
    })
})
