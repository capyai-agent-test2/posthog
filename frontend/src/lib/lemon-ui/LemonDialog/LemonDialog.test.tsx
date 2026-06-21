import { shouldSubmitDialogOnEnter } from './LemonDialog'

describe('LemonDialog', () => {
    it('blocks submit while IME composition is active', () => {
        expect(shouldSubmitDialogOnEnter(true)).toEqual(false)
    })

    it('allows submit when IME composition is inactive', () => {
        expect(shouldSubmitDialogOnEnter(false)).toEqual(true)
    })
})
