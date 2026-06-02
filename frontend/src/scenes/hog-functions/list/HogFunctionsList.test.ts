import { HogFunctionType } from '~/types'

import { sparklineMetricsForHogFunction, urlForHogFunction } from './HogFunctionsList'

const makeFn = (id: string): HogFunctionType => ({ id }) as HogFunctionType

describe('urlForHogFunction', () => {
    it('returns the bare hog function path when returnTo is undefined', () => {
        expect(urlForHogFunction(makeFn('abc123'))).toBe('/functions/abc123')
    })

    it('appends returnTo as a query param for a hog function id', () => {
        expect(urlForHogFunction(makeFn('abc123'), '/health/sdk-doctor')).toBe(
            '/functions/abc123?returnTo=%2Fhealth%2Fsdk-doctor'
        )
    })

    it('does not append returnTo for plugin- prefix IDs', () => {
        expect(urlForHogFunction(makeFn('plugin-7'), '/health/sdk-doctor')).toBe('/pipeline/plugins/7')
    })

    it('does not append returnTo for batch-export- prefix IDs', () => {
        expect(urlForHogFunction(makeFn('batch-export-9'), '/health/sdk-doctor')).toBe('/pipeline/batch-exports/9')
    })
})

describe('sparklineMetricsForHogFunction', () => {
    it('uses legacy plugin app metrics for plugin destinations', () => {
        expect(sparklineMetricsForHogFunction(makeFn('plugin-7'), 'destination', true)).toEqual({
            logicKey: 'legacy-plugin-7',
            forceParams: {
                appSource: 'legacy_plugin',
                appSourceId: '7',
                metricKind: ['success', 'failure'],
                breakdownBy: 'metric_kind',
                interval: 'day',
                dateFrom: '-7d',
            },
        })
    })

    it('does not show app metrics for plugin site apps', () => {
        expect(sparklineMetricsForHogFunction(makeFn('plugin-7'), 'site_app', true)).toBeNull()
    })

    it('uses hog function app metrics for regular hog functions', () => {
        expect(sparklineMetricsForHogFunction(makeFn('abc123'), 'destination', false)).toEqual({
            logicKey: 'abc123',
            forceParams: {
                appSource: 'hog_function',
                appSourceId: 'abc123',
                metricKind: ['success', 'failure'],
                breakdownBy: 'metric_kind',
                interval: 'day',
                dateFrom: '-7d',
            },
        })
    })
})
