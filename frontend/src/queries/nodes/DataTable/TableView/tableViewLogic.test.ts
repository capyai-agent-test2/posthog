import { NodeKind } from '~/queries/schema/schema-general'
import { PropertyOperator } from '~/types'

import { ColumnConfigurationApi } from 'products/product_analytics/frontend/generated/api.schemas'

import { getQueryFromView, TableViewSupportedQueryType } from './tableViewLogic'

describe('tableViewLogic', () => {
    const baseQuery: TableViewSupportedQueryType = {
        kind: NodeKind.EventsQuery,
        select: ['*'],
    } as TableViewSupportedQueryType

    it('promotes exact event markers to the scalar event field', () => {
        const view: ColumnConfigurationApi = {
            id: '1',
            context_key: 'test',
            filters: [{ key: 'event', value: 'pageview', operator: PropertyOperator.Exact }],
        } as ColumnConfigurationApi

        const result = getQueryFromView(baseQuery, view)

        expect(result).toMatchObject({
            event: 'pageview',
            properties: [],
        })
    })

    it('keeps regex event filters in properties', () => {
        const view: ColumnConfigurationApi = {
            id: '1',
            context_key: 'test',
            filters: [{ key: 'event', value: 'page', operator: PropertyOperator.Regex }],
        } as ColumnConfigurationApi

        const result = getQueryFromView(baseQuery, view)

        expect(result).toMatchObject({
            event: undefined,
            properties: [{ key: 'event', value: 'page', operator: PropertyOperator.Regex }],
        })
    })

    it('uses the last exact event marker when a user event filter is present first', () => {
        const view: ColumnConfigurationApi = {
            id: '1',
            context_key: 'test',
            filters: [
                { key: 'event', value: 'page', operator: PropertyOperator.Regex },
                { key: 'event', value: '$pageview', operator: PropertyOperator.Exact },
            ],
        } as ColumnConfigurationApi

        const result = getQueryFromView(baseQuery, view)

        expect(result).toMatchObject({
            event: '$pageview',
            properties: [{ key: 'event', value: 'page', operator: PropertyOperator.Regex }],
        })
    })

    it('promotes in event markers to the scalar events field', () => {
        const view: ColumnConfigurationApi = {
            id: '1',
            context_key: 'test',
            filters: [{ key: 'events', value: ['pageview', 'click'], operator: PropertyOperator.In }],
        } as ColumnConfigurationApi

        const result = getQueryFromView(baseQuery, view)

        expect(result).toMatchObject({
            events: ['pageview', 'click'],
            properties: [],
        })
    })

    it('keeps filters without operators in properties', () => {
        const view: ColumnConfigurationApi = {
            id: '1',
            context_key: 'test',
            filters: [{ key: 'something_else', value: 'value' } as any],
        } as ColumnConfigurationApi

        const result = getQueryFromView(baseQuery, view)

        expect(result).toMatchObject({
            properties: [{ key: 'something_else', value: 'value' }],
        })
    })
})
