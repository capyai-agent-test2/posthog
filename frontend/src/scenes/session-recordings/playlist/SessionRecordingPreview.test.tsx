jest.mock('@posthog/quill', () => ({}), { virtual: true })

import { SessionRecordingType } from '~/types'

import { gatherIconProperties } from './SessionRecordingPreview'

describe('SessionRecordingPreview', () => {
    it('does not fall back to person country before recording properties load', () => {
        const recording = {
            id: 'recording-1',
            viewed: false,
            viewers: [],
            recording_duration: 0,
            snapshot_source: 'web',
            person: {
                id: 'person-1',
                distinct_ids: [],
                properties: {
                    $geoip_country_code: 'US',
                    $browser: 'Chrome',
                    $device_type: 'Desktop',
                    $os: 'Mac OS X',
                },
            },
        } as SessionRecordingType

        const properties = gatherIconProperties(undefined, recording)

        expect(properties.map((property) => property.property)).not.toContain('$geoip_country_code')
        expect(properties).toMatchObject([
            { property: '$browser', value: 'Chrome', label: 'Chrome' },
            { property: '$device_type', value: 'Desktop', label: 'Desktop' },
            { property: '$os', value: 'Mac OS X', label: 'Mac OS X' },
        ])
    })

    it('uses recording country after recording properties load', () => {
        const properties = gatherIconProperties({
            $geoip_country_code: 'AR',
            $geoip_city_name: 'Buenos Aires',
            $geoip_subdivision_1_name: 'Buenos Aires F.D.',
            $browser: 'Chrome',
            $device_type: 'Desktop',
            $os: 'Mac OS X',
        })

        expect(properties).toContainEqual({
            property: '$geoip_country_code',
            value: 'AR',
            label: 'Buenos Aires, Buenos Aires F.D., Argentina',
        })
    })
})
