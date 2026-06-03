import { router } from 'kea-router'

import { useMocks } from '~/mocks/jest'
import { DataTableNode, NodeKind } from '~/queries/schema/schema-general'
import { initKeaTests } from '~/test/init'
import { ActionType } from '~/types'

import { sessionPlayerModalLogic } from '../../../../frontend/src/scenes/session-recordings/player/modal/sessionPlayerModalLogic'
import { DEFAULT_ACTION_STEP, actionEditLogic } from './actionEditLogic'

describe('actionEditLogic', () => {
    beforeEach(() => {
        useMocks({
            get: {
                '/api/projects/@current/actions/1/references': [],
            },
        })
        initKeaTests()
    })

    it('preserves matching events query when opening and closing the recording modal', () => {
        const action = {
            id: 1,
            name: 'Signed up',
            steps: [{ ...DEFAULT_ACTION_STEP }],
        } as ActionType

        const actionLogic = actionEditLogic({ id: 1, action, tabId: 'tab-1' })
        const modalLogic = sessionPlayerModalLogic()

        actionLogic.mount()
        modalLogic.mount()

        const modifiedQuery: DataTableNode = {
            ...actionLogic.values.matchingEventsQuery!,
            source: {
                ...(actionLogic.values.matchingEventsQuery!.source as Record<string, any>),
                after: '-90d',
            },
        }

        actionLogic.actions.setMatchingEventsQuery(modifiedQuery)

        modalLogic.actions.openSessionPlayer({ id: 'recording-1' }, 12345)

        expect(router.values.hashParams).toEqual({
            sessionRecordingId: 'recording-1',
        })
        expect(router.values.searchParams).toMatchObject({
            timestamp: 12345,
        })
        expect(actionLogic.values.matchingEventsQuery).toEqual(modifiedQuery)

        modalLogic.actions.closeSessionPlayer()

        expect(router.values.hashParams).toEqual({})
        expect(actionLogic.values.matchingEventsQuery).toEqual(modifiedQuery)
        expect((actionLogic.values.matchingEventsQuery?.source as { after?: string } | null)?.after).toBe('-90d')
        expect(actionLogic.values.matchingEventsQuery?.kind).toBe(NodeKind.DataTableNode)
    })

    it('does not reset matching events query on non-step form edits', () => {
        const action = {
            id: 1,
            name: 'Signed up',
            steps: [{ ...DEFAULT_ACTION_STEP }],
        } as ActionType

        const actionLogic = actionEditLogic({ id: 1, action, tabId: 'tab-1' })
        actionLogic.mount()

        const modifiedQuery: DataTableNode = {
            ...actionLogic.values.matchingEventsQuery!,
            source: {
                ...(actionLogic.values.matchingEventsQuery!.source as Record<string, any>),
                after: '-90d',
            },
        }

        actionLogic.actions.setMatchingEventsQuery(modifiedQuery)
        actionLogic.actions.setActionValue('name', 'Renamed action')

        expect(actionLogic.values.matchingEventsQuery).toEqual(modifiedQuery)
    })
})
