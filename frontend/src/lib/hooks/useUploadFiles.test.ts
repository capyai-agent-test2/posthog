import { act, renderHook, waitFor } from '@testing-library/react'

import api from 'lib/api'

import { useUploadFiles } from './useUploadFiles'

jest.mock('posthog-js', () => ({
    __esModule: true,
    default: { captureException: jest.fn() },
}))

describe('useUploadFiles', () => {
    let uploadMock: jest.SpyInstance

    beforeEach(() => {
        uploadMock = jest.spyOn(api.media, 'upload')
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('uploads once when the same file selection is set while an upload is in progress', async () => {
        let resolveUpload: (value: { image_location: string; name: string; id: string }) => void = jest.fn()
        uploadMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveUpload = resolve
                })
        )

        const onUpload = jest.fn()
        const onError = jest.fn()
        const { result } = renderHook(() => useUploadFiles({ onUpload, onError }))
        const file = new File(['image'], 'bug.gif', { type: 'image/gif' })

        act(() => {
            result.current.setFilesToUpload([file])
            result.current.setFilesToUpload([file])
        })

        await waitFor(() => {
            if (uploadMock.mock.calls.length !== 1) {
                throw new Error('waiting for upload to start')
            }
        })
        expect(uploadMock).toHaveBeenCalledTimes(1)

        act(() => {
            resolveUpload({ image_location: 'https://example.com/bug.gif', name: 'bug.gif', id: 'media-id' })
        })

        await waitFor(() => {
            if (onUpload.mock.calls.length !== 1) {
                throw new Error('waiting for upload to finish')
            }
        })
        expect(onUpload).toHaveBeenCalledWith('https://example.com/bug.gif', 'bug.gif', 'media-id')
        expect(onError).not.toHaveBeenCalled()
    })
})
