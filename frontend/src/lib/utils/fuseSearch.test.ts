import { createFuseMemoizer, createFuseSearch } from './fuseSearch'

describe('createFuseSearch', () => {
    interface Item {
        name: string
    }

    const items: Item[] = [
        { name: 'MCP server' },
        { name: 'Signed up' },
        { name: 'Map clicked' },
        { name: 'SMTP delivered' },
        { name: 'CMP accepted' },
        { name: 'Camp fire started' },
    ]

    const search = createFuseSearch<Item>(['name'])

    it.each([['mcp'], ['mcp '], [' mcp'], [' mcp '], ['mcp\t']])('returns only "MCP server" for query "%s"', (term) => {
        expect(search(items, term).map((i) => i.name)).toEqual(['MCP server'])
    })

    it.each([[''], ['   ']])('returns all items for empty or pure-whitespace query "%s"', (term) => {
        expect(search(items, term)).toEqual(items)
    })
})

describe('createFuseMemoizer', () => {
    it('returns the same Fuse instance for the same argument references', () => {
        const items = [{ name: 'alpha' }]
        const getFuse = createFuseMemoizer((source: { name: string }[]) => source, { keys: ['name'] })

        expect(getFuse(items)).toBe(getFuse(items))
    })

    it('returns a new Fuse instance when an argument reference changes', () => {
        const getFuse = createFuseMemoizer((source: { name: string }[]) => source, { keys: ['name'] })

        expect(getFuse([{ name: 'alpha' }])).not.toBe(getFuse([{ name: 'alpha' }]))
    })

    it('memoizes transformed Fuse collections against the original arguments', () => {
        const items = [{ name: 'alpha' }]
        const getFuse = createFuseMemoizer(
            (source: { name: string }[]) => source.map((item) => ({ ...item, searchName: item.name })),
            { keys: ['searchName'] }
        )

        expect(getFuse(items)).toBe(getFuse(items))
    })
})
