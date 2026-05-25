import type { GuardAvailableFeatureFn } from 'lib/components/UpgradeModal/upgradeModalLogic'
import { upgradeModalLogic } from 'lib/components/UpgradeModal/upgradeModalLogic'
import { userLogic } from 'scenes/userLogic'

import { AlertCalculationInterval } from '~/queries/schema/schema-general'
import { initKeaTests } from '~/test/init'
import { AvailableFeature } from '~/types'

import {
    getDefaultSimulationRange,
    getAlertTimingGuidance,
    isHighFrequencyAlertInterval,
    selectAlertCalculationInterval,
} from './alertIntervalHelpers'

describe('alertIntervalHelpers', () => {
    beforeEach(() => {
        initKeaTests()
    })

    describe('getDefaultSimulationRange', () => {
        it.each([
            [AlertCalculationInterval.EVERY_15_MINUTES, '-12h'],
            [AlertCalculationInterval.HOURLY, '-48h'],
            [AlertCalculationInterval.DAILY, '-30d'],
            [AlertCalculationInterval.WEEKLY, '-12w'],
            [AlertCalculationInterval.MONTHLY, '-12m'],
        ])('%s returns %s', (interval, expected) => {
            expect(getDefaultSimulationRange(interval)).toBe(expected)
        })
    })

    describe('selectAlertCalculationInterval', () => {
        beforeEach(() => {
            userLogic.mount()
            upgradeModalLogic.mount()
        })

        it('opens upgrade modal and does not update interval when 15-minute is selected without entitlement', () => {
            const onSelect = jest.fn()

            const applied = selectAlertCalculationInterval(AlertCalculationInterval.EVERY_15_MINUTES, {
                guardAvailableFeature: upgradeModalLogic.values.guardAvailableFeature,
                onSelect,
                hasHighFrequencyAlertsEntitlement: false,
            })

            expect(applied).toBe(false)
            expect(onSelect).not.toHaveBeenCalled()
            expect(upgradeModalLogic.values.upgradeModalFeatureKey).toBe(AvailableFeature.HIGH_FREQUENCY_ALERTS)
        })

        it('updates interval when 15-minute is selected with entitlement', () => {
            const onSelect = jest.fn()
            const guardAvailableFeature: GuardAvailableFeatureFn = (_feature, callback) => {
                callback?.()
                return true
            }

            const applied = selectAlertCalculationInterval(AlertCalculationInterval.EVERY_15_MINUTES, {
                guardAvailableFeature,
                onSelect,
                hasHighFrequencyAlertsEntitlement: true,
            })

            expect(applied).toBe(true)
            expect(onSelect).toHaveBeenCalledWith(AlertCalculationInterval.EVERY_15_MINUTES)
        })

        it('updates interval for non-15-minute options without calling the guard', () => {
            const onSelect = jest.fn()
            const guardAvailableFeature = jest.fn<
                ReturnType<GuardAvailableFeatureFn>,
                Parameters<GuardAvailableFeatureFn>
            >(() => true)

            selectAlertCalculationInterval(AlertCalculationInterval.HOURLY, {
                guardAvailableFeature,
                onSelect,
                hasHighFrequencyAlertsEntitlement: false,
            })

            expect(onSelect).toHaveBeenCalledWith(AlertCalculationInterval.HOURLY)
            expect(guardAvailableFeature).not.toHaveBeenCalled()
        })
    })

    describe('isHighFrequencyAlertInterval', () => {
        it.each([
            [AlertCalculationInterval.EVERY_15_MINUTES, true],
            [AlertCalculationInterval.HOURLY, true],
            [AlertCalculationInterval.DAILY, false],
            [AlertCalculationInterval.WEEKLY, false],
            [AlertCalculationInterval.MONTHLY, false],
        ])('%s → %s', (interval, expected) => {
            expect(isHighFrequencyAlertInterval(interval)).toBe(expected)
        })
    })

    describe('getAlertTimingGuidance', () => {
        it('explains completed-period behavior for hourly alerts until ongoing checks are enabled', () => {
            expect(getAlertTimingGuidance(AlertCalculationInterval.HOURLY, false, false)).toBe(
                'This runs on the hourly cadence it was created on and, by default, checks the last completed hour. Enable “Check ongoing period” if you want it to evaluate the current hour instead.'
            )
            expect(getAlertTimingGuidance(AlertCalculationInterval.HOURLY, true, false)).toBeNull()
        })

        it('explains completed-period behavior for 15-minute alerts until ongoing checks are enabled', () => {
            expect(getAlertTimingGuidance(AlertCalculationInterval.EVERY_15_MINUTES, false, false)).toBe(
                'This runs on the 15-minute cadence it was created on and, by default, checks the last completed 15 minutes. Enable “Check ongoing period” if you want it to evaluate the current 15 minutes instead.'
            )
        })

        it('explains daily timing, including weekend skip behavior', () => {
            expect(getAlertTimingGuidance(AlertCalculationInterval.DAILY, false, false)).toBe(
                'Daily alerts run around 1 AM in the project timezone and evaluate the previous day by default.'
            )
            expect(getAlertTimingGuidance(AlertCalculationInterval.DAILY, false, true)).toBe(
                'Daily alerts run around 1 AM in the project timezone. With weekend checks off, Saturday and Sunday are skipped, so Monday will still evaluate Sunday.'
            )
            expect(getAlertTimingGuidance(AlertCalculationInterval.DAILY, true, false)).toBe(
                'Daily alerts run around 1 AM in the project timezone. With “Check ongoing period” enabled, they evaluate the current day so far instead of the previous day.'
            )
            expect(getAlertTimingGuidance(AlertCalculationInterval.DAILY, true, true)).toBe(
                'Daily alerts run around 1 AM in the project timezone. With “Check ongoing period” enabled, they evaluate the current day so far instead of the previous day.'
            )
        })

        it('returns null for weekly and monthly alerts', () => {
            expect(getAlertTimingGuidance(AlertCalculationInterval.WEEKLY, false, false)).toBeNull()
            expect(getAlertTimingGuidance(AlertCalculationInterval.MONTHLY, false, false)).toBeNull()
        })
    })
})
