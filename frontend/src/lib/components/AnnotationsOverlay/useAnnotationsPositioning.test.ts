import { renderHook } from '@testing-library/react'

import { useAnnotationsPositioning } from './useAnnotationsPositioning'

describe('useAnnotationsPositioning', () => {
    it('uses data point spacing instead of sparse chart ticks', () => {
        const chart = {
            scales: {
                x: {
                    ticks: [{ value: 0 }, { value: 4 }],
                },
            },
            _metasets: [
                {
                    data: [{ x: 10 }, { x: 20 }, { x: 30 }, { x: 40 }, { x: 50 }],
                },
            ],
        }

        const { result } = renderHook(() => useAnnotationsPositioning(chart as never, 400, 200))

        expect(result.current.firstTickLeftPx).toBe(10)
        expect(result.current.tickIntervalPx).toBe(10)
        expect(result.current.getDataPointX(3)).toBe(40)
    })
})
