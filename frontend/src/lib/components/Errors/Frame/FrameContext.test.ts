import { ErrorTrackingStackFrameContext } from '../types'
import { getOrderedFrameContextLines } from './FrameContext'

describe('FrameContext', () => {
    it('orders context lines by line number without losing the highlighted frame line', () => {
        const context: ErrorTrackingStackFrameContext = {
            before: [
                { number: 42, line: 'before two' },
                { number: 41, line: 'before one' },
            ],
            line: { number: 43, line: 'error line' },
            after: [
                { number: 45, line: 'after two' },
                { number: 44, line: 'after one' },
            ],
        }

        expect(getOrderedFrameContextLines(context)).toEqual([
            { number: 41, line: 'before one', highlight: false },
            { number: 42, line: 'before two', highlight: false },
            { number: 43, line: 'error line', highlight: true },
            { number: 44, line: 'after one', highlight: false },
            { number: 45, line: 'after two', highlight: false },
        ])
    })
})
