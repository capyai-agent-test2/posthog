import { CLICK_OUTSIDE_BLOCK_CLASS } from 'lib/hooks/useOutsideClickHandler'

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

        const nestedOverlay = document.createElement('div')
        nestedOverlay.className = CLICK_OUTSIDE_BLOCK_CLASS
        const nestedOverlayChild = document.createElement('button')
        nestedOverlay.appendChild(nestedOverlayChild)

        const unrelatedPopover = document.createElement('div')
        unrelatedPopover.className = 'Popover'
        const unrelatedPopoverChild = document.createElement('button')
        unrelatedPopover.appendChild(unrelatedPopoverChild)

        const outside = document.createElement('button')

        document.body.append(triggerWrap, popoverContent, quillPortal, nestedOverlay, unrelatedPopover, outside)

        expect(isInsideTaxonomicFilterOverlay(triggerChild, triggerWrap)).toBe(true)
        expect(isInsideTaxonomicFilterOverlay(popoverChild, triggerWrap)).toBe(true)
        expect(isInsideTaxonomicFilterOverlay(quillChild, triggerWrap)).toBe(true)
        expect(isInsideTaxonomicFilterOverlay(nestedOverlayChild, triggerWrap)).toBe(true)
        expect(isInsideTaxonomicFilterOverlay(unrelatedPopoverChild, triggerWrap)).toBe(false)
        expect(isInsideTaxonomicFilterOverlay(outside, triggerWrap)).toBe(false)
    })
})
