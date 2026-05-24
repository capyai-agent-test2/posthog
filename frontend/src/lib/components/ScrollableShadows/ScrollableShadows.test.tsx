import '@testing-library/jest-dom'

import { render } from '@testing-library/react'

import { ScrollableShadows } from './ScrollableShadows'

describe('ScrollableShadows', () => {
    it.each([
        ['horizontal', { overflowX: 'auto', overflowY: 'hidden' }],
        ['vertical', { overflowX: 'hidden', overflowY: 'auto' }],
    ] as const)('sets %s scrolling to overflow auto', (direction, expectedStyle) => {
        const { container } = render(
            <ScrollableShadows direction={direction}>
                <div>content</div>
            </ScrollableShadows>
        )

        expect(container.querySelector('.ScrollableShadows__inner')).toHaveStyle(expectedStyle)
    })

    it('uses overflow auto on both axes when direction is omitted', () => {
        const { container } = render(
            <ScrollableShadows>
                <div>content</div>
            </ScrollableShadows>
        )

        expect(container.querySelector('.ScrollableShadows__inner')).toHaveStyle({
            overflowX: 'auto',
            overflowY: 'auto',
        })
    })
})
