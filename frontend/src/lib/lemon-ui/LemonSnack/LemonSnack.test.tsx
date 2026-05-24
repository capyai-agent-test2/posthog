import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'

import { LemonSnack } from './LemonSnack'

describe('LemonSnack', () => {
    it('keeps long values shrinkable inside flex layouts', () => {
        const regex =
            'friend|freind|frend|frind|teacher|teach|instructor|tutor|mentor|brother|sister|husband|family|relatives|person|people|student|colleague|clooeagues|work|job|school|academy|class|course|lecture|training|study|college|collage|university|recommendation'

        render(<LemonSnack>{regex}</LemonSnack>)

        const snackContent = screen.getByText(regex)
        expect(snackContent).toHaveClass('min-w-0')
        expect(snackContent.parentElement).toHaveClass('min-w-0')
    })
})
