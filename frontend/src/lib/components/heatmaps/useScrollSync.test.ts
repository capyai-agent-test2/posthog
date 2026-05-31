import { captureScrollableElementBaseline, findScrollableElement, isScrollableElement } from './useScrollSync'

function setElementScrollMetrics(
    element: HTMLElement,
    scrollHeight: number,
    clientHeight: number,
    scrollTop = 0
): void {
    Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true })
    Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true })
    Object.defineProperty(element, 'scrollTop', { value: scrollTop, configurable: true })
}

describe('useScrollSync helpers', () => {
    const getComputedStyle = window.getComputedStyle

    beforeEach(() => {
        window.getComputedStyle = ((element: Element) =>
            ({
                overflowY: (element as HTMLElement).dataset.overflowY ?? 'visible',
            }) as CSSStyleDeclaration) as typeof window.getComputedStyle
    })

    afterEach(() => {
        window.getComputedStyle = getComputedStyle
        document.body.innerHTML = ''
    })

    it('detects vertically scrollable elements', () => {
        const element = document.createElement('div')
        element.dataset.overflowY = 'auto'
        setElementScrollMetrics(element, 200, 100)

        expect(isScrollableElement(element)).toBe(true)
    })

    it('ignores elements without scrollable overflow', () => {
        const element = document.createElement('div')
        element.dataset.overflowY = 'hidden'
        setElementScrollMetrics(element, 200, 100)

        expect(isScrollableElement(element)).toBe(false)
    })

    it('finds the nearest scrollable ancestor for a nested scroll event target', () => {
        const scrollable = document.createElement('div')
        scrollable.dataset.overflowY = 'scroll'
        setElementScrollMetrics(scrollable, 200, 100)

        const child = document.createElement('button')
        scrollable.appendChild(child)
        document.body.appendChild(scrollable)

        expect(findScrollableElement(child)).toBe(scrollable)
    })

    it('captures scroll baselines lazily for interacted scroll containers', () => {
        const baselines = new Map<Element, number>()
        const scrollable = document.createElement('div')
        scrollable.dataset.overflowY = 'auto'
        setElementScrollMetrics(scrollable, 200, 100, 25)
        document.body.appendChild(scrollable)

        expect(captureScrollableElementBaseline(scrollable, baselines)).toBe(scrollable)

        expect(baselines.get(scrollable)).toBe(25)
    })
})
