import { getDefaultSessionRecordingConfig } from './config'
import { createSessionRecordingS3ClientConfig } from './s3-client-config'

const mockNodeHttpHandler = jest.fn().mockImplementation((config) => ({ config }))

jest.mock('@smithy/node-http-handler', () => ({
    NodeHttpHandler: mockNodeHttpHandler,
}))

describe('createSessionRecordingS3ClientConfig', () => {
    it('configures the AWS SDK request handler timeout from session recording config', () => {
        const config = {
            ...getDefaultSessionRecordingConfig(),
            SESSION_RECORDING_V2_S3_REGION: 'us-west-1',
            SESSION_RECORDING_V2_S3_ENDPOINT: 'https://s3.example.com',
            SESSION_RECORDING_V2_S3_TIMEOUT_MS: 600000,
        }

        const s3Config = createSessionRecordingS3ClientConfig(config)

        expect(s3Config).toEqual(
            expect.objectContaining({
                region: 'us-west-1',
                endpoint: 'https://s3.example.com',
                forcePathStyle: true,
                requestHandler: {
                    config: {
                        connectionTimeout: 600000,
                        requestTimeout: 600000,
                    },
                },
            })
        )
        expect(mockNodeHttpHandler).toHaveBeenCalledWith({
            connectionTimeout: 600000,
            requestTimeout: 600000,
        })
    })

    it('includes credentials when access keys are configured', () => {
        const config = {
            ...getDefaultSessionRecordingConfig(),
            SESSION_RECORDING_V2_S3_ACCESS_KEY_ID: 'access-key',
            SESSION_RECORDING_V2_S3_SECRET_ACCESS_KEY: 'secret-key',
        }

        const s3Config = createSessionRecordingS3ClientConfig(config)

        expect(s3Config.credentials).toEqual({
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
        })
    })
})
