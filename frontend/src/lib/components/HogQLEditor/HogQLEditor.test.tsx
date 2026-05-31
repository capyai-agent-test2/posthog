import '@testing-library/jest-dom'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { HogQLEditor } from './HogQLEditor'

jest.mock('lib/monaco/CodeEditorInline', () => ({
    CodeEditorInline: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
        <textarea data-attr="inline-hogql-editor" value={value} onChange={(event) => onChange(event.target.value)} />
    ),
}))

describe('HogQLEditor', () => {
    afterEach(() => {
        cleanup()
    })

    it('does not overwrite unsaved edits when the parent rerenders with a new value', () => {
        const onChange = jest.fn()
        const { rerender } = render(<HogQLEditor value="properties.$browser" onChange={onChange} />)

        fireEvent.change(screen.getByDisplayValue('properties.$browser'), {
            target: { value: 'properties.$browser_version' },
        })

        rerender(<HogQLEditor value="properties.$os" onChange={onChange} />)

        expect(screen.getByDisplayValue('properties.$browser_version')).toBeInTheDocument()
    })

    it('syncs incoming values while there are no unsaved edits', () => {
        const onChange = jest.fn()
        const { rerender } = render(<HogQLEditor value="properties.$browser" onChange={onChange} />)

        rerender(<HogQLEditor value="properties.$os" onChange={onChange} />)

        expect(screen.getByDisplayValue('properties.$os')).toBeInTheDocument()
    })

    it('syncs incoming values when the editing context changes', () => {
        const onChange = jest.fn()
        const { rerender } = render(
            <HogQLEditor value="properties.$browser" syncKey="browser-field" onChange={onChange} />
        )

        fireEvent.change(screen.getByDisplayValue('properties.$browser'), {
            target: { value: 'properties.$browser_version' },
        })

        rerender(<HogQLEditor value="properties.$os" syncKey="os-field" onChange={onChange} />)

        expect(screen.getByDisplayValue('properties.$os')).toBeInTheDocument()
    })
})
