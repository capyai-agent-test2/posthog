import { render } from '@testing-library/react'
import { useActions, useValues } from 'kea'
import React from 'react'

import { DataVisualizationNode, NodeKind } from '~/queries/schema/schema-general'
import { ChartDisplayType } from '~/types'

import { Table } from './Table'

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useValues: jest.fn(),
    useActions: jest.fn(),
}))

const mockLemonTable = jest.fn(() => null)

jest.mock('@posthog/lemon-ui', () => ({
    ...jest.requireActual('@posthog/lemon-ui'),
    LemonTable: (props: Record<string, unknown>): null => {
        mockLemonTable(props)
        return null
    },
    Tooltip: ({ children }: { children: React.ReactNode }): JSX.Element => <>{children}</>,
}))

jest.mock('../../DataTable/renderColumnMeta', () => ({
    renderColumnMeta: (columnName: string) => ({ title: columnName }),
}))

jest.mock('../../DataTable/renderColumn', () => ({
    renderColumn: (columnName: string, value: unknown) => `${columnName}:${String(value)}`,
}))

describe('Data visualization table headers', () => {
    const query: DataVisualizationNode = {
        kind: NodeKind.DataVisualizationNode,
        source: {
            kind: NodeKind.HogQLQuery,
            query: 'select 1 as really_long_column_name',
        },
        display: ChartDisplayType.ActionsTable,
    }

    beforeEach(() => {
        ;(useValues as jest.Mock).mockImplementation((logic: { key?: string }) => {
            if (logic?.key === 'DataVisualization.DataVizTheme') {
                return { isDarkModeOn: false }
            }

            return {
                tabularData: [
                    [{ formattedValue: 1, value: 1, sourceColumnName: 'really_long_column_name', type: 'int' }],
                ],
                tabularColumns: [{ column: { name: 'really_long_column_name' }, settings: null }],
                sourceTabularColumns: [
                    { column: { name: 'really_long_column_name', type: { name: 'Int64' } }, settings: null },
                ],
                conditionalFormattingRules: [],
                responseLoading: false,
                responseError: null,
                queryCancelled: false,
                response: { results: [[1]], columns: ['really_long_column_name'] },
                pinnedColumns: [],
                isColumnPinned: () => false,
                isPinningEnabled: false,
            }
        })
        ;(useActions as jest.Mock).mockReturnValue({ toggleColumnPin: jest.fn() })
        mockLemonTable.mockClear()
    })

    it('does not force narrow wrapped headers for SQL tables', () => {
        render(<Table query={query} uniqueKey="sql-table" context={undefined} cachedResults={undefined} />)

        const props = mockLemonTable.mock.calls[0][0] as {
            columns: { title: React.ReactNode }[]
            maxHeaderWidth?: string
        }
        expect(props.maxHeaderWidth).toBeUndefined()

        const { container } = render(<>{props.columns[0].title}</>)
        expect(container.textContent).toContain('really_long_column_name')
        expect(container.querySelector('wbr')).toBeNull()
    })
})
