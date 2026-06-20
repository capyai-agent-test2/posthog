import { getDefaultImageHeight } from './NotebookNodeImageUtils'

describe('getDefaultImageHeight', () => {
    it('scales landscape images to the displayed width', () => {
        expect(getDefaultImageHeight({ naturalHeight: 1200, naturalWidth: 2400, clientWidth: 800 })).toBe(400)
    })

    it('caps tall images at the maximum default height', () => {
        expect(getDefaultImageHeight({ naturalHeight: 2400, naturalWidth: 800, clientWidth: 800 })).toBe(1000)
    })

    it('falls back to natural height when the rendered width is unavailable', () => {
        expect(getDefaultImageHeight({ naturalHeight: 1200, naturalWidth: 2400, clientWidth: 0 })).toBe(1000)
    })
})
