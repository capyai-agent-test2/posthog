import { getAlertSeriesLabel } from './AlertDefinitionSection'

describe('AlertDefinitionSection', () => {
    describe('getAlertSeriesLabel', () => {
        it.each([
            [
                { custom_name: 'Custom pageview', name: '$pageview', event: '$pageview' },
                0,
                false,
                'A - Custom pageview',
            ],
            [{ custom_name: null, name: 'All events', event: null }, 0, false, 'A - All events'],
            [{ custom_name: null, name: null, event: null }, 0, false, 'A - All events'],
            [{ custom_name: null, name: '$pageview', event: '$pageview' }, 1, true, 'any breakdown value'],
        ])('returns %s for series %j', (series, index, isBreakdownValid, expected) => {
            expect(getAlertSeriesLabel(series, index, isBreakdownValid)).toBe(expected)
        })
    })
})
