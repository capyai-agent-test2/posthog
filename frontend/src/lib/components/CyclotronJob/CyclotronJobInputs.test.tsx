import '@testing-library/jest-dom'

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'kea'
import type { ReactNode } from 'react'

import { initKeaTests } from '~/test/init'
import type { CyclotronJobInputType } from '~/types'

import { CyclotronJobInputs } from './CyclotronJobInputs'

jest.mock('lib/ui/quill', () => ({
    Combobox: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div>,
    ComboboxContent: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div>,
    ComboboxEmpty: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div>,
    ComboboxInput: (): JSX.Element => <input />,
    ComboboxItem: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div>,
    ComboboxList: ({ children }: { children: ReactNode }): JSX.Element => <div>{children}</div>,
}))

jest.mock('lib/monaco/CodeEditorInline', () => ({
    CodeEditorInline: ({
        value,
        onChange,
    }: {
        value?: string
        onChange?: (value: string | undefined) => void
    }): JSX.Element => (
        <input aria-label="Value" value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} />
    ),
}))

describe('CyclotronJobInputs', () => {
    beforeEach(() => {
        initKeaTests()
    })

    afterEach(() => {
        cleanup()
    })

    it('commits dictionary entry edits immediately', async () => {
        const onInputChange = jest.fn<void, [string, CyclotronJobInputType]>()

        render(
            <Provider>
                <CyclotronJobInputs
                    configuration={{
                        inputs_schema: [{ key: 'headers', type: 'dictionary', label: 'Headers' }],
                        inputs: { headers: { value: {} } },
                    }}
                    onInputChange={onInputChange}
                    showSource={false}
                    sampleGlobalsWithInputs={null}
                />
            </Provider>
        )

        await userEvent.click(screen.getByText('Add entry'))
        await userEvent.type(screen.getByPlaceholderText('Key'), 'X-Test')
        await userEvent.type(screen.getByLabelText('Value'), 'example')

        expect(onInputChange).toHaveBeenLastCalledWith('headers', { value: { 'X-Test': 'example' } })
    })
})
