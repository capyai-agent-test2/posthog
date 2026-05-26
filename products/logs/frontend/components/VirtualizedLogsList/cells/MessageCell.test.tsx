import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'

import { MessageCell } from './MessageCell'

jest.mock('kea', () => ({
    ...jest.requireActual('kea'),
    useValues: jest.fn(() => ({ id: 'test-logs' })),
}))

jest.mock('products/logs/frontend/components/LogsViewer/logsViewerLogic', () => ({
    logsViewerLogic: {},
}))

jest.mock('products/logs/frontend/components/VirtualizedLogsList/useCellScroll', () => ({
    useCellScrollRef: jest.fn(() => ({
        scrollRef: { current: null },
        handleScroll: jest.fn(),
    })),
}))

describe('MessageCell', () => {
    it('constrains wrapped long messages within the message column', () => {
        render(<MessageCell message="very long log line" wrapBody={true} prettifyJson={false} parsedBody={null} />)

        const message = screen.getByText('very long log line')
        const scrollContainer = message.parentElement?.parentElement
        const cellContainer = scrollContainer?.parentElement

        expect(cellContainer).toHaveClass('min-w-0', 'overflow-hidden')
        expect(scrollContainer).toHaveClass('min-w-0', 'overflow-hidden')
    })

    it('constrains horizontally scrollable long messages within the message column', () => {
        render(
            <MessageCell message="very long json log line" wrapBody={false} prettifyJson={false} parsedBody={null} />
        )

        const message = screen.getByText('very long json log line')
        const scrollContainer = message.parentElement?.parentElement
        const cellContainer = scrollContainer?.parentElement

        expect(cellContainer).toHaveClass('min-w-0', 'overflow-hidden')
        expect(scrollContainer).toHaveClass('min-w-0', 'overflow-x-auto')
    })
})
