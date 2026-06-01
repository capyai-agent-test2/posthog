import { runSessionReplayPipeline } from '../ingestion/session_replay'
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

jest.mock('../ingestion/session_replay', () => ({
    createSessionReplayPipeline: jest.fn(),
    runSessionReplayPipeline: jest.fn().mockResolvedValue(undefined),
}))

describe('SessionRecordingIngester', () => {
    it('does not reject when flushing the current batch fails', async () => {
        const error = new Error('storage timeout')
        const ingester = Object.create(SessionRecordingIngester.prototype) as {
            sessionBatchManager: { flush: jest.Mock<Promise<void>, []> }
            flushCurrentBatch: () => Promise<boolean>
        }
        ingester.sessionBatchManager = {
            flush: jest.fn().mockRejectedValue(error),
        }

        await expect(ingester.flushCurrentBatch()).resolves.toBe(false)
        expect(logger.error).toHaveBeenCalledWith('🔁', 'blob_ingester_consumer_v2 - failed to flush session batch', {
            error,
        })
        expect(captureException).toHaveBeenCalledWith(error)
    })

    it('retries a pending flush before processing more Kafka messages', async () => {
        const ingester = Object.create(SessionRecordingIngester.prototype) as {
            kafkaConsumer: { heartbeat: jest.Mock<void, []> }
            sessionBatchManager: {
                shouldFlush: jest.Mock<boolean, []>
                flush: jest.Mock<Promise<void>, []>
            }
            processBatchMessages: (messages: []) => Promise<void>
        }
        ingester.kafkaConsumer = { heartbeat: jest.fn() }
        ingester.sessionBatchManager = {
            shouldFlush: jest.fn().mockReturnValue(true),
            flush: jest.fn().mockRejectedValue(new Error('storage timeout')),
        }

        await expect(ingester.processBatchMessages([])).resolves.toBeUndefined()

        expect(ingester.sessionBatchManager.flush).toHaveBeenCalledTimes(1)
        expect(runSessionReplayPipeline).not.toHaveBeenCalled()
    })
})
