import { formatWebAnalyticsCompareLabel, toUtcOffsetFormat } from './WebAnalyticsTile'

describe('toUtcOffsetFormat', () => {
    it.each([
        [0, 'UTC'],
        [0.25, 'UTC+0:15'],
        [1, 'UTC+1'],
        [1.5, 'UTC+1:30'],
        [-0, 'UTC'],
        [-0.25, 'UTC-0:15'],
        [-1, 'UTC-1'],
        [-1.5, 'UTC-1:30'],
    ])('should format %d to %s', (minutes, expected) => {
        expect(toUtcOffsetFormat(minutes)).toEqual(expected)
    })
})

describe('formatWebAnalyticsCompareLabel', () => {
    it.each([
        ['previous', undefined, 'Previous period'],
        ['previous', '1 Jan 2026', 'Previous period (1 Jan 2026)'],
        ['current', undefined, 'Current period'],
        ['custom', undefined, 'Custom'],
    ])('formats %s with date label %s', (label, dateLabel, expected) => {
        expect(formatWebAnalyticsCompareLabel(label, dateLabel)).toEqual(expected)
    })
})
