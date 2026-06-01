import { getToolbarHeatmapJsData } from 'lib/components/heatmaps/HeatmapCanvas'

jest.mock('./HeatmapEventsPanel', () => ({ HeatmapEventsPanel: () => null }))
jest.mock('./ScrollDepthCanvas', () => ({ ScrollDepthCanvas: () => null }))

describe('getToolbarHeatmapJsData', () => {
    const heatmapElements = [
        { count: 3, xPercentage: 0.25, targetFixed: false, y: 200 },
        { count: 5, xPercentage: 0.5, targetFixed: true, y: 100 },
    ]

    it('keeps fixed target points in the scrolled layer when showing scrolled data', () => {
        const { scrolledHeatmapJsData, fixedHeatmapJsData } = getToolbarHeatmapJsData(heatmapElements, 1000, 'relative')

        expect(scrolledHeatmapJsData.data).toEqual([
            { x: 250, y: 200, value: 3 },
            { x: 500, y: 100, value: 5 },
        ])
        expect(scrolledHeatmapJsData.max).toBe(5)
        expect(fixedHeatmapJsData.data).toEqual([])
    })

    it('splits fixed target points into a viewport-fixed layer when showing fixed data', () => {
        const { scrolledHeatmapJsData, fixedHeatmapJsData } = getToolbarHeatmapJsData(heatmapElements, 1000, 'fixed')

        expect(scrolledHeatmapJsData.data).toEqual([{ x: 250, y: 200, value: 3 }])
        expect(scrolledHeatmapJsData.max).toBe(5)
        expect(fixedHeatmapJsData.data).toEqual([{ x: 500, y: 100, value: 5 }])
        expect(fixedHeatmapJsData.max).toBe(5)
    })

    it('excludes hidden fixed target points from the visible layer intensity scale', () => {
        const { scrolledHeatmapJsData, fixedHeatmapJsData } = getToolbarHeatmapJsData(heatmapElements, 1000, 'hidden')

        expect(scrolledHeatmapJsData.data).toEqual([{ x: 250, y: 200, value: 3 }])
        expect(scrolledHeatmapJsData.max).toBe(3)
        expect(fixedHeatmapJsData.data).toEqual([])
    })
})
