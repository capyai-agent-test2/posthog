import { getKafkaConfigFromEnv } from './config'

describe('getKafkaConfigFromEnv', () => {
    const OLD_ENV = process.env

    beforeEach(() => {
        jest.resetModules()
        process.env = { ...OLD_ENV }
    })

    afterAll(() => {
        process.env = OLD_ENV
    })

    it('converts KAFKA_PRODUCER_ env vars to rdkafka config', () => {
        process.env.KAFKA_PRODUCER_COMPRESSION_TYPE = 'gzip'
        process.env.KAFKA_PRODUCER_QUEUE_BUFFERING_MAX_MS = '1000'
        process.env.KAFKA_PRODUCER_ENABLE_IDEMPOTENCE = 'false'

        const config = getKafkaConfigFromEnv('PRODUCER')

        expect(config).toMatchInlineSnapshot(`
            {
              "compression.type": "gzip",
              "enable.idempotence": false,
              "queue.buffering.max.ms": 1000,
            }
        `)
    })

    it('ignores env vars that do not start with its prefix', () => {
        process.env.KAFKA_CONSUMER_GROUP_ID = 'test-group'
        process.env.KAFKA_PRODUCER_COMPRESSION_TYPE = 'gzip'

        expect(getKafkaConfigFromEnv('PRODUCER')).toMatchInlineSnapshot(`
            {
              "compression.type": "gzip",
            }
        `)
        expect(getKafkaConfigFromEnv('CONSUMER')).toMatchInlineSnapshot(`
            {
              "group.id": "test-group",
            }
        `)
        expect(getKafkaConfigFromEnv('CDP_PRODUCER')).toMatchInlineSnapshot(`{}`)
    })

    it('accepts legacy KAFKA_CONSUMPTION_ consumer env vars', () => {
        process.env.KAFKA_CONSUMPTION_SESSION_TIMEOUT_MS = '180000'
        process.env.KAFKA_CONSUMPTION_MAX_POLL_INTERVAL_MS = '600000'

        expect(getKafkaConfigFromEnv('CONSUMER')).toMatchInlineSnapshot(`
            {
              "max.poll.interval.ms": 600000,
              "session.timeout.ms": 180000,
            }
        `)
    })

    it('prefers KAFKA_CONSUMER_ env vars over legacy KAFKA_CONSUMPTION_ env vars', () => {
        process.env.KAFKA_CONSUMPTION_SESSION_TIMEOUT_MS = '180000'
        process.env.KAFKA_CONSUMER_SESSION_TIMEOUT_MS = '240000'

        expect(getKafkaConfigFromEnv('CONSUMER')).toMatchInlineSnapshot(`
            {
              "session.timeout.ms": 240000,
            }
        `)
    })

    it('ignores empty values', () => {
        process.env.KAFKA_PRODUCER_COMPRESSION_TYPE = ''
        process.env.KAFKA_PRODUCER_VALID_SETTING = 'value'

        const config = getKafkaConfigFromEnv('PRODUCER')

        expect(config).toMatchInlineSnapshot(`
            {
              "valid.setting": "value",
            }
        `)
    })
})
