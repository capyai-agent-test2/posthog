import { getToolbarRemScale } from './toolbarRemScale'

describe('getToolbarRemScale', () => {
    afterEach(() => {
        jest.restoreAllMocks()
        document.documentElement.style.fontSize = ''
    })

    it.each([
        ['keeps the default scale for standard rem sizes', '16px', 1],
        ['keeps the default scale for accessible rem sizes', '20px', 1],
        ['rescales very small rem sizes back to normal', '1px', 16],
        ['rescales very large rem sizes back to normal', '32px', 0.5],
    ])('%s', (_name: string, fontSize: string, expectedScale: number) => {
        document.documentElement.style.fontSize = fontSize

        expect(getToolbarRemScale(document)).toBe(expectedScale)
    })

    it('falls back to no scaling when the root font size is unavailable', () => {
        document.documentElement.style.fontSize = ''
        jest.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize: '' } as CSSStyleDeclaration)

        expect(getToolbarRemScale(document)).toBe(1)
    })
})
