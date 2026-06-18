import '@testing-library/jest-dom'

import { render } from '@testing-library/react'
import { useMountedLogic, useValues } from 'kea'
import type React from 'react'

import { NodeKind } from '~/queries/schema/schema-general'

import { Settings } from './NotebookNodeQuery'

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useMountedLogic: jest.fn(),
    useValues: jest.fn(),
}))

jest.mock('~/queries/Query/Query', () => ({
    Query: ({ query, embedded }: { query: { embedded?: boolean }; embedded?: boolean }) => (
        <div data-attr="query" data-embedded-prop={String(embedded)} data-query-embedded={String(query.embedded)} />
    ),
}))

jest.mock('@posthog/lemon-ui', () => ({
    LemonButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

jest.mock('lib/components/ScrollableShadows/ScrollableShadows', () => ({
    ScrollableShadows: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('scenes/insights/insightDataLogic', () => ({
    insightDataLogic: { findMounted: jest.fn() },
}))

jest.mock('scenes/insights/insightLogic', () => ({
    insightLogic: jest.fn(),
}))

jest.mock('scenes/insights/summarizeInsight', () => ({
    useSummarizeInsight: () => jest.fn(),
}))

jest.mock('scenes/notebooks/Nodes/NodeWrapper', () => ({
    createPostHogWidgetNode: (node: unknown) => node,
}))

jest.mock('scenes/urls', () => ({
    urls: {
        insightEdit: (id: string) => `/insights/${id}/edit`,
        insightNew: () => '/insights/new',
        insightView: (id: string) => `/insights/${id}`,
    },
}))

jest.mock('./components/NotebookSQLEditor', () => ({
    EMBEDDED_SQL_EDITOR_DEFAULT_HEIGHT: 200,
    EMBEDDED_SQL_EDITOR_MIN_HEIGHT: 100,
    getSqlEditorSourceQuery: jest.fn(() => null),
    NotebookSQLEditorOutput: () => null,
    NotebookSQLEditorSettings: () => null,
}))

jest.mock('./notebookNodeLogic', () => ({
    notebookNodeLogic: { __mock: 'notebookNodeLogic' },
}))

jest.mock('./sharedNodeSupport', () => ({
    UnsupportedNodePlaceholder: () => null,
}))

const mockedUseMountedLogic = useMountedLogic as jest.Mock
const mockedUseValues = useValues as jest.Mock

describe('NotebookNodeQuery Settings', () => {
    beforeEach(() => {
        mockedUseMountedLogic.mockReturnValue({ __mock: 'nodeLogic' })
        mockedUseValues.mockImplementation((logic: { __mock?: string }) => {
            if (logic.__mock === 'nodeLogic') {
                return { notebookLogic: { __mock: 'notebookLogic' } }
            }
            if (logic.__mock === 'notebookLogic') {
                return { canvasFiltersOverride: { type: 'AND', values: [] } }
            }
            throw new Error(`Unhandled logic: ${JSON.stringify(logic)}`)
        })
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('renders insight settings using the full editor layout', () => {
        const { container } = render(
            <Settings
                attributes={{
                    nodeId: 'node-1',
                    isDefaultFilterApplied: true,
                    query: {
                        kind: NodeKind.InsightVizNode,
                        source: {
                            kind: NodeKind.TrendsQuery,
                            series: [],
                        },
                    },
                }}
                updateAttributes={jest.fn()}
            />
        )

        const query = container.querySelector('[data-attr="query"]')

        expect(query).toHaveAttribute('data-embedded-prop', 'undefined')
        expect(query).toHaveAttribute('data-query-embedded', 'false')
    })
})
