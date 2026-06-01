import { DateTime } from 'luxon'

import { PluginEvent } from '~/plugin-scaffold'

import { InternalPerson, Team } from '../../../types'
import { PersonContext, PersonOutputs } from './person-context'
import { PersonMergeService } from './person-merge-service'
import { PersonMessage } from './person-message'
import { PersonsStore } from './persons-store'

describe('PersonMergeService', () => {
    const team = { id: 2 } as Team
    const event = {
        event: '$identify',
        uuid: 'event-uuid',
        properties: {},
    } as PluginEvent
    type TestTransaction = {
        updatePersonForMerge: jest.Mock
        moveDistinctIds: jest.Mock
        updateCohortsAndFeatureFlagsForMerge: jest.Mock
        deletePerson: jest.Mock
    }

    function makePerson(overrides: Partial<InternalPerson>): InternalPerson {
        return {
            id: '1',
            uuid: '00000000-0000-0000-0000-000000000001',
            team_id: team.id,
            properties: {},
            properties_last_updated_at: {},
            properties_last_operation: {},
            is_user_id: null,
            is_identified: false,
            created_at: DateTime.fromISO('2024-01-01T00:00:00.000Z').toUTC(),
            version: 0,
            last_seen_at: null,
            ...overrides,
        }
    }

    it('keeps the oldest person created_at when merging existing persons', async () => {
        const sourceCreatedAt = DateTime.fromISO('2024-01-01T00:00:00.000Z').toUTC()
        const targetCreatedAt = DateTime.fromISO('2024-03-01T00:00:00.000Z').toUTC()
        const sourcePerson = makePerson({
            id: '1',
            uuid: '00000000-0000-0000-0000-000000000001',
            created_at: sourceCreatedAt,
        })
        const targetPerson = makePerson({
            id: '2',
            uuid: '00000000-0000-0000-0000-000000000002',
            created_at: targetCreatedAt,
            is_identified: true,
        })

        const updatePersonForMerge = jest.fn((person: InternalPerson, update: Partial<InternalPerson>) =>
            Promise.resolve([{ ...person, ...update }, [] as PersonMessage[], false])
        )
        const tx = {
            updatePersonForMerge,
            moveDistinctIds: jest.fn(() =>
                Promise.resolve({ success: true, messages: [], distinctIdsMoved: ['anon-id'] })
            ),
            updateCohortsAndFeatureFlagsForMerge: jest.fn(() => Promise.resolve(undefined)),
            deletePerson: jest.fn(() => Promise.resolve([])),
        }
        const personStore = {
            inTransaction: jest.fn((_description: string, callback: (tx: TestTransaction) => Promise<unknown>) =>
                callback(tx)
            ),
        }
        const context = new PersonContext(
            event,
            team,
            'user-id',
            DateTime.fromISO('2024-04-01T00:00:00.000Z').toUTC(),
            true,
            { produce: jest.fn(() => Promise.resolve(undefined)) } as unknown as PersonOutputs,
            personStore as unknown as PersonsStore,
            0,
            { type: 'SYNC', batchSize: undefined },
            false,
            false
        )

        const result = await new PersonMergeService(context).mergePeople({
            mergeInto: targetPerson,
            mergeIntoDistinctId: 'user-id',
            otherPerson: sourcePerson,
            otherPersonDistinctId: 'anon-id',
        })

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.person?.created_at.toISO()).toBe(sourceCreatedAt.toISO())
        }
        expect(updatePersonForMerge).toHaveBeenCalledWith(
            targetPerson,
            expect.objectContaining({ created_at: sourceCreatedAt }),
            'user-id'
        )
    })
})
