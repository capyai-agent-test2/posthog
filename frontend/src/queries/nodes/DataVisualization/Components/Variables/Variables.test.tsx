import '@testing-library/jest-dom'

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'kea'

import { VariableComponent } from './Variables'

describe('VariableComponent', () => {
    afterEach(() => {
        cleanup()
    })

    it('shows the null toggle for dashboard list variables', async () => {
        const onChange = jest.fn()

        render(
            <Provider>
                <VariableComponent
                    variable={{
                        id: 'professional_type',
                        name: 'Professional type',
                        code_name: 'professional_type',
                        type: 'List',
                        values: ['student', 'professional'],
                        default_value: 'student',
                    }}
                    showEditingUI={false}
                    onChange={onChange}
                    variableOverridesAreSet={false}
                    size="small"
                />
            </Provider>
        )

        expect(screen.getByText('Set to null')).toBeInTheDocument()

        await userEvent.click(screen.getByRole('switch', { name: 'Set to null' }))

        expect(onChange).toHaveBeenCalledWith('professional_type', null, true)
    })

    it('restores a concrete list value when null mode is turned off', async () => {
        const onChange = jest.fn()

        render(
            <Provider>
                <VariableComponent
                    variable={{
                        id: 'professional_type',
                        name: 'Professional type',
                        code_name: 'professional_type',
                        type: 'List',
                        values: ['student', 'professional'],
                        default_value: 'student',
                        isNull: true,
                    }}
                    showEditingUI={false}
                    onChange={onChange}
                    variableOverridesAreSet={false}
                    size="small"
                />
            </Provider>
        )

        await userEvent.click(screen.getByRole('switch', { name: 'Set to null' }))

        expect(onChange).toHaveBeenCalledWith('professional_type', 'student', false)
    })
})
