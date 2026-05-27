import '@testing-library/jest-dom'

import { fireEvent, render } from '@testing-library/react'

import { LemonInput } from './LemonInput'

describe('LemonInput', () => {
    it('skips Enter handlers while IME composition is active', () => {
        const onKeyDown = jest.fn()
        const onPressEnter = jest.fn()

        const { container } = render(
            <LemonInput value="" onChange={() => undefined} onKeyDown={onKeyDown} onPressEnter={onPressEnter} />
        )

        const input = container.querySelector('input')

        expect(input).not.toBeNull()

        fireEvent.keyDown(input as HTMLInputElement, { key: 'Enter', isComposing: true })

        expect(onKeyDown).not.toHaveBeenCalled()
        expect(onPressEnter).not.toHaveBeenCalled()
    })

    it('still handles Enter after composition completes', () => {
        const onKeyDown = jest.fn()
        const onPressEnter = jest.fn()

        const { container } = render(
            <LemonInput value="" onChange={() => undefined} onKeyDown={onKeyDown} onPressEnter={onPressEnter} />
        )

        const input = container.querySelector('input')

        expect(input).not.toBeNull()

        fireEvent.keyDown(input as HTMLInputElement, { key: 'Enter', isComposing: false })

        expect(onKeyDown).toHaveBeenCalledTimes(1)
        expect(onPressEnter).toHaveBeenCalledTimes(1)
    })
})
