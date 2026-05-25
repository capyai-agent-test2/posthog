jest.mock(
    '@posthog/quill',
    () => ({
        Button: () => null,
        DropdownMenu: () => null,
        DropdownMenuContent: () => null,
        DropdownMenuItem: () => null,
        DropdownMenuSeparator: () => null,
        DropdownMenuTrigger: () => null,
        Popover: () => null,
        PopoverContent: () => null,
        PopoverTrigger: () => null,
        cn: (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' '),
    }),
    { virtual: true }
)

import { isInsideTaxonomicFilterOverlay } from './TaxonomicFilterMenu'

describe('TaxonomicFilterMenu outside click detection', () => {
    it('keeps nested overlay interactions inside the taxonomic filter', () => {
        const triggerWrap = document.createElement('span')
        const triggerChild = document.createElement('button')
        triggerWrap.appendChild(triggerChild)

        const popoverContent = document.createElement('div')
        popoverContent.setAttribute('data-slot', 'popover-content')
        const popoverChild = document.createElement('button')
        popoverContent.appendChild(popoverChild)

        const quillPortal = document.createElement('div')
        quillPortal.setAttribute('data-quill-portal', '')
        const quillChild = document.createElement('button')
        quillPortal.appendChild(quillChild)

        const lemonPopover = document.createElement('div')
        lemonPopover.className = 'Popover'
        const lemonPopoverChild = document.createElement('button')
        lemonPopover.appendChild(lemonPopoverChild)

        const outside = document.createElement('button')

        document.body.append(triggerWrap, popoverContent, quillPortal, lemonPopover, outside)

        expect(isInsideTaxonomicFilterOverlay(triggerChild, triggerWrap)).toBe(true)
        expect(isInsideTaxonomicFilterOverlay(popoverChild, triggerWrap)).toBe(true)
        expect(isInsideTaxonomicFilterOverlay(quillChild, triggerWrap)).toBe(true)
        expect(isInsideTaxonomicFilterOverlay(lemonPopoverChild, triggerWrap)).toBe(true)
        expect(isInsideTaxonomicFilterOverlay(outside, triggerWrap)).toBe(false)
    })
})
