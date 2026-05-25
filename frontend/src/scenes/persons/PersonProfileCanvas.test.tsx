import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

import { PersonType, PropertyFilterType, PropertyOperator } from '~/types'

import PersonProfileCanvas from './PersonProfileCanvas'

const useAttachedLogicMock = jest.fn()
const notebookLogicMock = jest.fn((props) => ({ props }))
const customerProfileLogicMock = jest.fn((props) => ({ __mockValues: { content: [] }, props }))

jest.mock('kea', () => ({
    BindLogic: ({ children }: { children: ReactNode }) => <>{children}</>,
    useActions: jest.fn(() => ({ reportPersonProfileViewed: jest.fn() })),
    useValues: jest.fn((logic) => logic?.__mockValues ?? {}),
}))

jest.mock('lib/hooks/useOnMountEffect', () => ({
    useOnMountEffect: (callback: () => void) => callback(),
}))

jest.mock('lib/logic/scenes/useAttachedLogic', () => ({
    useAttachedLogic: (...args: unknown[]) => useAttachedLogicMock(...args),
}))

jest.mock('scenes/notebooks/Notebook/notebookLogic', () => ({
    notebookLogic: (props: unknown) => notebookLogicMock(props),
}))

jest.mock('scenes/notebooks/Notebook/Notebook', () => ({
    Notebook: () => <div>Notebook</div>,
}))

jest.mock('products/customer_analytics/frontend/customerProfileLogic', () => ({
    customerProfileLogic: (props: unknown) => customerProfileLogicMock(props),
    CustomerProfileScope: { PERSON: 'person' },
}))

jest.mock('products/customer_analytics/frontend/components/CustomerProfileMenu', () => ({
    CustomerProfileMenu: () => <div>Customer profile menu</div>,
}))

describe('PersonProfileCanvas', () => {
    const person: PersonType = {
        id: 'person-1',
        uuid: 'uuid-1',
        distinct_ids: ['distinct-1'],
        properties: {},
        is_identified: true,
        created_at: '2024-01-01',
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('scopes notebook and profile logic by internal tab id', () => {
        render(<PersonProfileCanvas person={person} tabId="tab-a" attachTo={{} as any} />)

        expect(notebookLogicMock).toHaveBeenCalledWith({
            shortId: 'canvas-person-1-tab-a',
            mode: 'canvas',
            canvasFiltersOverride: [
                {
                    type: PropertyFilterType.EventMetadata,
                    key: 'person_id',
                    value: 'person-1',
                    operator: PropertyOperator.Exact,
                },
            ],
        })
        expect(customerProfileLogicMock).toHaveBeenCalledWith({
            attrs: {
                personId: 'person-1',
                distinctIds: ['distinct-1'],
                tabId: 'tab-a',
            },
            scope: 'person',
            key: 'customer-profile-person-person-1-tab-a',
            canvasShortId: 'canvas-person-1-tab-a',
        })
        expect(useAttachedLogicMock).toHaveBeenCalled()
    })
})
