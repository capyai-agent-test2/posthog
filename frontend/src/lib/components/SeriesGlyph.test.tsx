import { cleanup, render } from '@testing-library/react'

import { SeriesLetter } from './SeriesGlyph'

jest.mock('kea', () => ({
    useValues: jest.fn(() => ({ isDarkModeOn: false })),
}))

describe('SeriesLetter', () => {
    afterEach(cleanup)

    it('uses the explicit series color for breakdown tooltip glyphs', () => {
        const { getByText } = render(<SeriesLetter hasBreakdown seriesIndex={0} seriesColor="#ff0000" />)
        const letter = getByText('A')

        expect(letter.style.borderColor).toBe('#ff0000')
        expect(letter.style.color).toBe('rgb(255, 0, 0)')
    })

    it('keeps breakdown glyphs neutral when no explicit series color is available', () => {
        const { getByText } = render(<SeriesLetter hasBreakdown seriesIndex={0} />)
        const letter = getByText('A')

        expect(letter.getAttribute('style')).toBeNull()
    })
})
