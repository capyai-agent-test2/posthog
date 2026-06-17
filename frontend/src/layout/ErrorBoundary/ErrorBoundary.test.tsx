import { AppErrorBoundary } from './ErrorBoundary'

describe('AppErrorBoundary', () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('does not switch to fallback UI for browser DOM modification errors', () => {
        jest.spyOn(console, 'warn').mockImplementation()
        const captureException = jest.fn()
        const boundary = new AppErrorBoundary({ children: 'content' })
        boundary.context = {
            client: { captureException },
        } as typeof boundary.context

        boundary.componentDidCatch(
            new Error("Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."),
            { componentStack: '\n    at TranslatedNode' }
        )

        expect(captureException).not.toHaveBeenCalled()
        expect(boundary.state.componentStack).toBeNull()
        expect(boundary.render()).toBe('content')
    })
})
