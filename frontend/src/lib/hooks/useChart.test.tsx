import { render } from '@testing-library/react'

import { useChart } from './useChart'

type MockChart = {
    resize: jest.Mock
    destroy: jest.Mock
}

const mockChartInstances = (): MockChart[] => (globalThis as any).__mockChartInstances
let mockResizeObserverCallback: ResizeObserverCallback | null = null

jest.mock('lib/Chart', () => ({
    Chart: class {
        static getChart = jest.fn(() => null)

        resize = jest.fn()
        destroy = jest.fn()

        constructor() {
            ;((globalThis as any).__mockChartInstances ??= []).push(this)
        }
    },
}))

function ChartComponent(): JSX.Element {
    const { canvasRef } = useChart({
        getConfig: () => ({ type: 'line', data: { labels: [], datasets: [] } }),
        deps: [],
    })

    return (
        <div>
            <canvas ref={canvasRef} />
        </div>
    )
}

describe('useChart', () => {
    const originalResizeObserver = global.ResizeObserver
    const originalRequestAnimationFrame = global.requestAnimationFrame
    const originalCancelAnimationFrame = global.cancelAnimationFrame

    beforeEach(() => {
        ;(globalThis as any).__mockChartInstances = []
        mockResizeObserverCallback = null
        global.ResizeObserver = class {
            constructor(callback: ResizeObserverCallback) {
                mockResizeObserverCallback = callback
            }
            observe = jest.fn()
            disconnect = jest.fn()
            unobserve = jest.fn()
        } as unknown as typeof ResizeObserver
        global.requestAnimationFrame = ((callback: FrameRequestCallback): number => {
            callback(0)
            return 1
        }) as typeof requestAnimationFrame
        global.cancelAnimationFrame = jest.fn()
    })

    afterEach(() => {
        global.ResizeObserver = originalResizeObserver
        global.requestAnimationFrame = originalRequestAnimationFrame
        global.cancelAnimationFrame = originalCancelAnimationFrame
    })

    it('resizes the chart when its parent size changes', () => {
        render(<ChartComponent />)

        expect(mockChartInstances()).toHaveLength(1)

        mockResizeObserverCallback?.([] as ResizeObserverEntry[], {} as ResizeObserver)

        expect(mockChartInstances()[0].resize).toHaveBeenCalledTimes(1)
    })
})
