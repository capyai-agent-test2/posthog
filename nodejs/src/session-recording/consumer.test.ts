import { logger } from '../utils/logger'
import { captureException } from '../utils/posthog'
import { SessionRecordingIngester } from './consumer'

jest.mock('../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock('../utils/posthog', () => ({
    captureException: jest.fn(),
}))

describe('SessionRecordingIngester', () => {
    it('does not reject when flushing the current batch fails', async () => {
        const error = new Error('storage timeout')
        const ingester = Object.create(SessionRecordingIngester.prototype) as {
            sessionBatchManager: { flush: jest.Mock<Promise<void>, []> }
            flushCurrentBatch: () => Promise<void>
        }
        ingester.sessionBatchManager = {
            flush: jest.fn().mockRejectedValue(error),
        }

        await expect(ingester.flushCurrentBatch()).resolves.toBeUndefined()
        expect(logger.error).toHaveBeenCalledWith('🔁', 'blob_ingester_consumer_v2 - failed to flush session batch', {
            error,
        })
        expect(captureException).toHaveBeenCalledWith(error)
    })
})
