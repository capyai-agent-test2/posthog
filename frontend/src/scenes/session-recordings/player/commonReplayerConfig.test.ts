import { COMMON_REPLAYER_CONFIG } from '@posthog/replay-shared'

describe('COMMON_REPLAYER_CONFIG', () => {
    it('replays focus changes so focus-driven overlays remain visible', () => {
        expect(COMMON_REPLAYER_CONFIG.triggerFocus).toBe(true)
    })
})
