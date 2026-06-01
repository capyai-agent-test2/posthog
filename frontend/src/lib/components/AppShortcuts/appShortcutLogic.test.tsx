import { appShortcutLogic } from 'lib/components/AppShortcuts/appShortcutLogic'

import { initKeaTests } from '~/test/init'

describe('appShortcutLogic', () => {
    let logic: ReturnType<typeof appShortcutLogic.build>

    beforeEach(() => {
        initKeaTests()
        localStorage.clear()
        logic = appShortcutLogic()
        logic.mount()
    })

    afterEach(() => {
        logic.unmount()
    })

    it('triggers the most recently registered matching shortcut', () => {
        const firstCallback = jest.fn()
        const secondCallback = jest.fn()

        logic.actions.registerAppShortcut({
            name: 'FirstShortcut',
            keybind: [['e']],
            intent: 'First shortcut',
            interaction: 'function',
            callback: firstCallback,
        })
        logic.actions.registerAppShortcut({
            name: 'SecondShortcut',
            keybind: [['e']],
            intent: 'Second shortcut',
            interaction: 'function',
            callback: secondCallback,
        })

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }))

        expect(firstCallback).not.toHaveBeenCalled()
        expect(secondCallback).toHaveBeenCalledTimes(1)
    })

    it('triggers an exact sequence match before a later longer prefix match', () => {
        const shorterCallback = jest.fn()
        const longerCallback = jest.fn()

        logic.actions.registerAppShortcut({
            name: 'ShorterShortcut',
            keybind: [['g', 'then', 'h']],
            intent: 'Shorter shortcut',
            interaction: 'function',
            callback: shorterCallback,
        })
        logic.actions.registerAppShortcut({
            name: 'LongerShortcut',
            keybind: [['g', 'then', 'h', 'then', 'i']],
            intent: 'Longer shortcut',
            interaction: 'function',
            callback: longerCallback,
        })

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }))

        expect(shorterCallback).toHaveBeenCalledTimes(1)
        expect(longerCallback).not.toHaveBeenCalled()
    })
})
