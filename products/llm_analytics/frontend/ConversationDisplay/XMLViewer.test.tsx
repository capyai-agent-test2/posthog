import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'

import { XMLViewer } from './XMLViewer'

describe('XMLViewer', () => {
    it('falls back to raw text when XML parsing fails', () => {
        const content = '<img src="./docs/assets/images/logo.png" width=400></img>'

        render(<XMLViewer>{content}</XMLViewer>)

        expect(screen.getByText(content)).toBeInTheDocument()
        expect(screen.queryByText('Invalid XML content')).not.toBeInTheDocument()
    })
})
