import '@testing-library/jest-dom'

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { initKeaTests } from '~/test/init'
import { ActionStepType } from '~/types'

import { ActionStep } from './ActionStep'

jest.mock('lib/components/PropertyFilters/PropertyFilters', () => ({
    PropertyFilters: (): JSX.Element => <div data-testid="property-filters" />,
}))

jest.mock('lib/components/PropertyFilters/components/TaxonomicPropertyFilter', () => ({
    DEFAULT_TAXONOMIC_GROUP_TYPES: [],
}))

jest.mock('./EventName', () => ({
    EventName: (): JSX.Element => <div data-testid="event-name" />,
}))

const baseStep: ActionStepType = {
    event: '$autocapture',
    href_matching: 'contains',
    url_matching: 'contains',
}

describe('ActionStep', () => {
    afterEach(cleanup)

    beforeEach(() => {
        initKeaTests()
    })

    it('hides unused autocapture fields and offers add buttons', () => {
        render(
            <ActionStep
                step={baseStep}
                actionId={1}
                isOnlyStep
                index={0}
                identifier="test"
                onDelete={jest.fn()}
                onChange={jest.fn()}
            />
        )

        expect(screen.queryByText('Element text')).not.toBeInTheDocument()
        expect(screen.queryByText('Page URL')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Add element text' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Add page URL' })).toBeInTheDocument()
    })

    it('shows existing autocapture criteria and can add another field', async () => {
        const user = userEvent.setup()

        render(
            <ActionStep
                step={{ ...baseStep, text: 'Sign up' }}
                actionId={1}
                isOnlyStep
                index={0}
                identifier="test"
                onDelete={jest.fn()}
                onChange={jest.fn()}
            />
        )

        expect(screen.getByText('Element text')).toBeInTheDocument()
        expect(screen.queryByText('Element link target')).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Add link target' }))

        expect(screen.getByText('Element link target')).toBeInTheDocument()
    })
})
