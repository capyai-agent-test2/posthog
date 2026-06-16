jest.mock('../utils/playerUtils', () => ({
    THUMB_OFFSET: 7.5,
}))

import { getSeekbarPreviewPercentage } from './PlayerSeekbarPreviewUtils'

describe('getSeekbarPreviewPercentage', () => {
    function setRect(element: HTMLElement, rect: Partial<DOMRect>): void {
        jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
            x: 100,
            y: 0,
            width: 200,
            height: 20,
            top: 0,
            right: 300,
            bottom: 20,
            left: 100,
            toJSON: jest.fn(),
            ...rect,
        } as DOMRect)
    }

    it('uses pointer position for regular seekbar hover', () => {
        const seekBar = document.createElement('div')
        const target = document.createElement('div')
        setRect(seekBar, {})

        const event = new MouseEvent('mousemove', { clientX: 150 })
        Object.defineProperty(event, 'target', { value: target })

        expect(getSeekbarPreviewPercentage(event, seekBar, null, 0)).toBe(0.25)
    })

    it('uses marker center when hovering the marker', () => {
        const seekBar = document.createElement('div')
        const thumb = document.createElement('div')
        setRect(seekBar, {})

        const event = new MouseEvent('mousemove', { clientX: 100 })
        Object.defineProperty(event, 'target', { value: thumb })

        expect(getSeekbarPreviewPercentage(event, seekBar, thumb, 92.5)).toBe(0.5)
    })
})
