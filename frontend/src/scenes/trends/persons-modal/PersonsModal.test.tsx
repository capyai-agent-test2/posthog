import '@testing-library/jest-dom'

import { createAndInsertPersonsModalRoot } from './PersonsModal'

describe('createAndInsertPersonsModalRoot', () => {
    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
        jest.restoreAllMocks()
        document.body.innerHTML = ''
    })

    it('defers root unmount until after the current tick', () => {
        jest.useFakeTimers()

        const { onDestroy } = createAndInsertPersonsModalRoot()

        onDestroy()

        expect(document.body.children).toHaveLength(1)

        jest.runAllTimers()

        expect(document.body.children).toHaveLength(0)
    })
})
