import { LemonDialog } from 'lib/lemon-ui/LemonDialog'

import { Billing } from './Billing'
import { openBillingPopupModal } from './BillingPopup'

jest.mock('lib/lemon-ui/LemonDialog', () => ({
    LemonDialog: {
        open: jest.fn(),
    },
}))

describe('openBillingPopupModal', () => {
    beforeEach(() => {
        jest.mocked(LemonDialog.open).mockClear()
    })

    it('renders billing content without scene redirects', () => {
        openBillingPopupModal()

        expect(LemonDialog.open).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.objectContaining({
                    type: Billing,
                    props: { isPopup: true },
                }),
            })
        )
    })
})
