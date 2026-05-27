import '@testing-library/jest-dom'

import { fireEvent, render } from '@testing-library/react'

import { LemonTextArea } from './LemonTextArea'

describe('LemonTextArea', () => {
    it('skips Enter handlers while IME composition is active', () => {
        const onKeyDown = jest.fn()
        const onPressEnter = jest.fn()

        const { container } = render(
            <LemonTextArea value="hello" onChange={() => undefined} onKeyDown={onKeyDown} onPressEnter={onPressEnter} />
        )

        const textarea = container.querySelector('textarea')

        expect(textarea).not.toBeNull()

        fireEvent.keyDown(textarea as HTMLTextAreaElement, { key: 'Enter', isComposing: true })

        expect(onKeyDown).not.toHaveBeenCalled()
        expect(onPressEnter).not.toHaveBeenCalled()
    })

    it('still handles Enter after composition completes', () => {
        const onKeyDown = jest.fn()
        const onPressEnter = jest.fn()

        const { container } = render(
            <LemonTextArea value="hello" onChange={() => undefined} onKeyDown={onKeyDown} onPressEnter={onPressEnter} />
        )

        const textarea = container.querySelector('textarea')

        expect(textarea).not.toBeNull()

        fireEvent.keyDown(textarea as HTMLTextAreaElement, { key: 'Enter', isComposing: false })

        expect(onKeyDown).toHaveBeenCalledTimes(1)
        expect(onPressEnter).toHaveBeenCalledWith('hello')
    })
})
