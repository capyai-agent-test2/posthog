import { expectLogic } from 'kea-test-utils'

import api from 'lib/api'
import { dayjs } from 'lib/dayjs'
import { featureFlagLogic } from 'lib/logic/featureFlagLogic'
import { playerCommentOverlayLogic } from 'scenes/session-recordings/player/commenting/playerFrameCommentOverlayLogic'

import { setupSessionRecordingTest } from '../__mocks__/test-setup'

jest.mock('../snapshot-processing/DecompressionWorkerManager')

const playerLogicProps = { sessionRecordingId: '1', playerKey: 'playlist', recordingId: '1' }

describe('playerCommentOverlayLogic', () => {
    let logic: ReturnType<typeof playerCommentOverlayLogic.build>
    let updateCommentMock: jest.Mock

    beforeEach(() => {
        updateCommentMock = jest.fn(() => Promise.resolve({}))
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

    it('uses the preserved recording timestamp when saving an edited comment', async () => {
        const commentTimestamp = dayjs('2025-01-02T03:04:05.000Z')

        jest.spyOn(api.comments, 'update').mockImplementation(updateCommentMock)

        await expectLogic(logic, () => {
            logic.actions.editComment({
                commentId: 'comment-1',
                content: 'Needs a sharper punchline',
                richContent: null,
                recordingId: '1',
                timestampInRecording: 12000,
                dateForTimestamp: commentTimestamp,
            })
        }).toFinishAllListeners()

        await expectLogic(logic, () => {
            logic.actions.submitRecordingComment()
        }).toFinishAllListeners()

        expect(updateCommentMock).toHaveBeenCalledWith(
            'comment-1',
            expect.objectContaining({
                item_context: expect.objectContaining({
                    time_in_recording: commentTimestamp.toISOString(),
                    milliseconds_into_recording: 12000,
                }),
            })
        )
    })
})
