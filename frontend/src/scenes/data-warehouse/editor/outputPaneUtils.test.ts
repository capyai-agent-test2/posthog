import { getResultColumnWidth } from './outputPaneUtils'

describe('getResultColumnWidth', () => {
    it('uses a concrete minimum width for short content', () => {
        expect(getResultColumnWidth(3)).toBe(120)
    })

    it('sizes medium content based on content length', () => {
        expect(getResultColumnWidth(20)).toBe(208)
    })

    it('caps long content at the maximum width', () => {
        expect(getResultColumnWidth(200)).toBe(600)
    })
})
