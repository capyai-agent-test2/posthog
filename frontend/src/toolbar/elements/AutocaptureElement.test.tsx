import { fireEvent, render } from '@testing-library/react'

import { AutocaptureElement } from './AutocaptureElement'

describe('AutocaptureElement', () => {
    it('prevents page click handlers from receiving inspect overlay clicks', () => {
        const onDocumentClick = jest.fn()
        const onClick = jest.fn()
        document.addEventListener('click', onDocumentClick)

        const { container } = render(
            <AutocaptureElement
                rect={{ top: 0, right: 10, bottom: 10, left: 0, height: 10, width: 10, x: 0, y: 0 }}
                style={{}}
                onClick={onClick}
                onMouseOver={jest.fn()}
                onMouseOut={jest.fn()}
            />
        )

        fireEvent.click(container.firstChild as HTMLElement)

        expect(onClick).toHaveBeenCalledTimes(1)
        expect(onDocumentClick).not.toHaveBeenCalled()

        document.removeEventListener('click', onDocumentClick)
    })
})
