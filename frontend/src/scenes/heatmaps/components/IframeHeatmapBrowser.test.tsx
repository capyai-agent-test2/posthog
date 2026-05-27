import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'

import { IframeHeatmapBrowser } from './IframeHeatmapBrowser'

const mockUseValues = jest.fn()
const mockUseActions = jest.fn()

jest.mock('kea', () => ({
    useValues: (): unknown => mockUseValues(),
    useActions: (): unknown => mockUseActions(),
}))

jest.mock('lib/components/heatmaps/HeatmapCanvas', () => ({
    HeatmapCanvas: (): JSX.Element => <div data-attr="mock-heatmap-canvas" />,
}))

jest.mock('scenes/heatmaps/components/heatmapsBrowserLogic', () => ({
    heatmapsBrowserLogic: (): Record<string, never> => ({}),
}))

describe('IframeHeatmapBrowser', () => {
    beforeEach(() => {
        mockUseValues.mockReturnValue({
            widthOverride: 1280,
            heightOverride: 2400,
            dataUrl: 'https://example.com/data',
            displayUrl: 'https://example.com/display',
        })
        mockUseActions.mockReturnValue({
            onIframeLoad: jest.fn(),
        })
    })

    it('renders the iframe inside a scrollable preview container', () => {
        const iframeRef = { current: null }
        const { container } = render(<IframeHeatmapBrowser iframeRef={iframeRef} />)

        const iframe = screen.getByTitle('Heatmap browser')

        expect(iframe).toHaveAttribute('src', 'https://example.com/display')
        expect(iframe.parentElement).toHaveStyle({ width: '1280px', height: '2400px' })
        expect(iframe.parentElement?.parentElement).toHaveClass('overflow-auto')
        expect(container.querySelector('[data-attr="mock-heatmap-canvas"]')).toBeInTheDocument()
    })
})
