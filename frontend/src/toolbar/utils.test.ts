import { asNonEmptyString, elementIsVisible, joinWithUiHost, slashDotDataAttrUnescape } from './utils'

describe('utils', () => {
    describe('asNonEmptyString', () => {
        const testCases: Array<{ input: unknown; expected: string | null }> = [
            { input: 'hello', expected: 'hello' },
            { input: '', expected: null },
            { input: null, expected: null },
            { input: undefined, expected: null },
            { input: true, expected: null },
            { input: false, expected: null },
            { input: 0, expected: null },
            { input: 1, expected: null },
            { input: {}, expected: null },
            { input: [], expected: null },
            { input: ['a'], expected: null },
        ]
        it.each(testCases)('$input -> $expected', ({ input, expected }) => {
            expect(asNonEmptyString(input)).toBe(expected)
        })
    })

    describe('joinWithUiHost', () => {
        const testCases: Array<{ uiHost: string; path: string; expected: string }> = [
            {
                uiHost: 'https://us.posthog.com',
                path: '/settings/project',
                expected: 'https://us.posthog.com/settings/project',
            },
            {
                uiHost: 'https://us.posthog.com/',
                path: '/settings/project',
                expected: 'https://us.posthog.com/settings/project',
            },
            {
                uiHost: 'https://us.posthog.com///',
                path: 'settings/project',
                expected: 'https://us.posthog.com/settings/project',
            },
            {
                uiHost: 'https://us.posthog.com',
                path: 'settings/project',
                expected: 'https://us.posthog.com/settings/project',
            },
            {
                uiHost: 'https://us.posthog.com/',
                path: '///settings/project',
                expected: 'https://us.posthog.com/settings/project',
            },
            {
                uiHost: 'https://us.posthog.com',
                path: `${'/settings/project'}#heatmaps`,
                expected: 'https://us.posthog.com/settings/project#heatmaps',
            },
            { uiHost: 'https://us.posthog.com', path: '?a=1', expected: 'https://us.posthog.com/?a=1' },
            { uiHost: 'https://us.posthog.com', path: '#hash', expected: 'https://us.posthog.com/#hash' },
            { uiHost: 'https://us.posthog.com', path: 'https://example.com/x', expected: 'https://example.com/x' },
            { uiHost: 'https://us.posthog.com', path: '//example.com/x', expected: '//example.com/x' },
            { uiHost: '', path: '/settings/project', expected: '/settings/project' },
        ]

        testCases.forEach(({ uiHost, path, expected }) => {
            it(`joins "${uiHost}" + "${path}"`, () => {
                expect(joinWithUiHost(uiHost, path)).toBe(expected)
            })
        })
    })

    describe('slashDotDataAttrUnescape', () => {
        const testCases = [
            {
                input: 'div[data-attr="test"]',
                expected: 'div[data-attr="test"]',
            },
            {
                input: 'div[data-attr="test\\."]',
                expected: 'div[data-attr="test."]',
            },
            {
                input: 'div[data-something="test\\.test\\.test"]',
                expected: 'div[data-something="test.test.test"]',
            },
            {
                input: '.tomato div[data-something="test\\.test\\.test"]',
                expected: '.tomato div[data-something="test.test.test"]',
            },
            {
                input: '\\.tomato div[data-something="test\\.test\\.test"]',
                expected: '.tomato div[data-something="test.test.test"]',
            },
        ]
        testCases.forEach(({ input, expected }) => {
            it(`should unescape "${input}" to "${expected}"`, () => {
                const result = slashDotDataAttrUnescape(input)
                expect(result).toBe(expected)
            })
        })
    })

    describe('elementIsVisible', () => {
        function addRenderedElement(style?: string): HTMLElement {
            const element = document.createElement('button')
            if (style) {
                element.setAttribute('style', style)
            }
            element.getClientRects = jest.fn(() => [{ width: 10, height: 10 }] as unknown as DOMRectList)
            document.body.appendChild(element)
            return element
        }

        afterEach(() => {
            document.body.innerHTML = ''
        })

        it('treats elements inside fully transparent parents as hidden', () => {
            const parent = document.createElement('div')
            parent.setAttribute('style', 'opacity: 0')
            const child = addRenderedElement()
            parent.appendChild(child)
            document.body.appendChild(parent)

            expect(elementIsVisible(child, new WeakMap())).toBe(false)
        })

        it('keeps rendered elements with visible parents selectable', () => {
            const parent = document.createElement('div')
            const child = addRenderedElement()
            parent.appendChild(child)
            document.body.appendChild(parent)

            expect(elementIsVisible(child, new WeakMap())).toBe(true)
        })
    })
})
