import { expectLogic } from 'kea-test-utils'

import { dayjs } from 'lib/dayjs'
import { featureFlagLogic } from 'lib/logic/featureFlagLogic'
import { playerCommentOverlayLogic } from 'scenes/session-recordings/player/commenting/playerFrameCommentOverlayLogic'

import { setupSessionRecordingTest } from '../__mocks__/test-setup'

jest.mock('../snapshot-processing/DecompressionWorkerManager')

const playerLogicProps = { sessionRecordingId: '1', playerKey: 'playlist', recordingId: '1' }

describe('playerCommentOverlayLogic', () => {
    let logic: ReturnType<typeof playerCommentOverlayLogic.build>

    beforeEach(() => {
        setupSessionRecordingTest()
        featureFlagLogic.mount()

        logic = playerCommentOverlayLogic(playerLogicProps)
        logic.mount()
    })

    it('preserves the comment timestamp when starting an edit', async () => {
        const commentTimestamp = dayjs('2025-01-02T03:04:05.000Z')

        await expectLogic(logic, () => {
            logic.actions.editComment({
                commentId: 'comment-1',
                content: 'Needs a sharper punchline',
                richContent: null,
                recordingId: '1',
                timeInRecording: '00:00:12',
                timestampInRecording: 12000,
                dateForTimestamp: commentTimestamp,
            })
        }).toMatchValues({
            recordingComment: {
                commentId: 'comment-1',
                content: 'Needs a sharper punchline',
                richContent: null,
                recordingId: '1',
                timeInRecording: '00:00:12',
                timestampInRecording: 12000,
                dateForTimestamp: commentTimestamp,
            },
        })
    })
})
