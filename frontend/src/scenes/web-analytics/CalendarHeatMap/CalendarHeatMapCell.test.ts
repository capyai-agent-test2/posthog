import { getBackgroundColorSaturation } from './CalendarHeatMapCell'

describe('CalendarHeatMapCell', () => {
    it('keeps zero and minimum values faint', () => {
        expect(getBackgroundColorSaturation({ value: 0, minValue: 0, maxValue: 500 })).toBe(0.1)
        expect(getBackgroundColorSaturation({ value: 3, minValue: 3, maxValue: 500 })).toBe(0.1)
    })

    it('uses full saturation for the maximum value', () => {
        expect(getBackgroundColorSaturation({ value: 500, minValue: 3, maxValue: 500 })).toBe(1)
    })

    it('spreads non-outlier values apart when the range has a large outlier', () => {
        const lowValueSaturation = getBackgroundColorSaturation({ value: 15, minValue: 3, maxValue: 500 })
        const midValueSaturation = getBackgroundColorSaturation({ value: 41, minValue: 3, maxValue: 500 })

        expect(lowValueSaturation).toBeGreaterThan(0.4)
        expect(midValueSaturation).toBeGreaterThan(lowValueSaturation)
        expect(midValueSaturation - lowValueSaturation).toBeGreaterThan(0.1)
    })
})
