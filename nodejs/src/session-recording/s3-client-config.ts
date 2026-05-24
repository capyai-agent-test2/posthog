import { S3ClientConfig } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'

import { SessionRecordingConfig } from './config'

export function createSessionRecordingS3ClientConfig(config: SessionRecordingConfig): S3ClientConfig {
    const s3Config: S3ClientConfig = {
        region: config.SESSION_RECORDING_V2_S3_REGION,
        endpoint: config.SESSION_RECORDING_V2_S3_ENDPOINT,
        forcePathStyle: true,
        requestHandler: new NodeHttpHandler({
            connectionTimeout: config.SESSION_RECORDING_V2_S3_TIMEOUT_MS,
            requestTimeout: config.SESSION_RECORDING_V2_S3_TIMEOUT_MS,
        }),
    }

    if (config.SESSION_RECORDING_V2_S3_ACCESS_KEY_ID && config.SESSION_RECORDING_V2_S3_SECRET_ACCESS_KEY) {
        s3Config.credentials = {
            accessKeyId: config.SESSION_RECORDING_V2_S3_ACCESS_KEY_ID,
            secretAccessKey: config.SESSION_RECORDING_V2_S3_SECRET_ACCESS_KEY,
        }
    }

    return s3Config
}
