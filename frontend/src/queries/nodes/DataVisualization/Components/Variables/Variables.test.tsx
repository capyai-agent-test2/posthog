import '@testing-library/jest-dom'

import { render } from '@testing-library/react'

import { VariableInput } from './Variables'

describe('VariableInput', () => {
    const baseProps = {
        showEditingUI: false,
        closePopover: jest.fn(),
        onChange: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('resyncs local value and null state when the variable prop changes', () => {
        const { container, rerender } = render(
            <VariableInput
                {...baseProps}
                variable={{
                    id: 'var-1',
                    code_name: 'start_date',
                    name: 'Start date',
                    type: 'String',
                    default_value: '',
                    value: '',
                    isNull: true,
                }}
            />
        )

        const disabledWrapper = container.querySelector('.pointer-events-none')
        expect(disabledWrapper).toBeInTheDocument()

        rerender(
            <VariableInput
                {...baseProps}
                variable={{
                    id: 'var-1',
                    code_name: 'start_date',
                    name: 'Start date',
                    type: 'String',
                    default_value: '',
                    value: '2025-09-01',
                    isNull: false,
                }}
            />
        )

        expect(container.querySelector('.pointer-events-none')).not.toBeInTheDocument()
        expect(container.querySelector('input')).toHaveValue('2025-09-01')
    })
})
