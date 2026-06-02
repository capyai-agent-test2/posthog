import { getDataTableRowKey } from './dataTableLogic'

describe('getDataTableRowKey', () => {
    it('uses the event uuid from the wildcard column when present', () => {
        expect(
            getDataTableRowKey(
                {
                    result: ['event name', { uuid: 'event-uuid' }],
                },
                2,
                ['event', '*']
            )
        ).toEqual('event-uuid')
    })

    it('falls back to the row index when no stable event uuid exists', () => {
        expect(getDataTableRowKey({ result: ['event name'] }, 2, ['event'])).toEqual(2)
    })
})
