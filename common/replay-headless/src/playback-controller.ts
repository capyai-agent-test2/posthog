import type { Replayer } from 'posthog-js/rrweb'
import type { eventWithTime } from 'posthog-js/rrweb-types'

import type { RecordingSegment } from '@posthog/replay-shared'

import type { HostBridge } from './host-bridge'

/**
 * Controls playback lifecycle: starts the replayer, skips inactive
 * segments, and stops when the recording finishes or a configured
 * end timestamp is reached.
 */
export class PlaybackController {
    private stopped = false
    private finishHoldTimeout: number | null = null

    constructor(
        private replayer: Replayer,
        private segments: RecordingSegment[],
        private firstTimestamp: number,
        private options: { skipInactivity?: boolean; endOffsetS?: number; playbackSpeed?: number },
        private bridge: HostBridge
    ) {
        this.replayer.on('finish', () => this.handleFinish())

        if (this.options.endOffsetS != null) {
            const endTs = this.firstTimestamp + this.options.endOffsetS * 1000
            this.replayer.on('event-cast', (event: eventWithTime) => {
                if (event.timestamp >= endTs) {
                    this.replayer.pause()
                    this.stop()
                }
            })
        }
    }

    get isStopped(): boolean {
        return this.stopped
    }

    start(startOffset: number): void {
        if (this.options.skipInactivity) {
            this.startInactivitySkipLoop()
        }
        this.replayer.play(startOffset)
    }

    stop(): void {
        if (this.stopped) {
            return
        }
        this.stopped = true
        if (this.finishHoldTimeout !== null) {
            window.clearTimeout(this.finishHoldTimeout)
            this.finishHoldTimeout = null
        }
        this.bridge.signalEnded()
    }

    private handleFinish(): void {
        if (this.options.endOffsetS == null) {
            this.stop()
            return
        }

        const remainingRecordingMs = this.options.endOffsetS * 1000 - this.replayer.getCurrentTime()
        if (remainingRecordingMs <= 0) {
            this.stop()
            return
        }

        const playbackSpeed =
            this.options.playbackSpeed && this.options.playbackSpeed > 0 ? this.options.playbackSpeed : 1
        const remainingWallClockMs = remainingRecordingMs / playbackSpeed

        this.finishHoldTimeout = window.setTimeout(() => {
            this.finishHoldTimeout = null
            this.stop()
        }, remainingWallClockMs)
    }

    /**
     * Skip inactive segments by polling the current playback position
     * each frame. Under puppeteer-capture's virtual time, rAF fires
     * once per beginFrame call, so this is deterministic.
     */
    private startInactivitySkipLoop(): void {
        const checkAndSkip = (): void => {
            if (this.stopped) {
                return
            }
            const ts = this.firstTimestamp + this.replayer.getCurrentTime()
            const inactiveSeg = this.segments.find(
                (seg: RecordingSegment) => !seg.isActive && ts >= seg.startTimestamp && ts <= seg.endTimestamp
            )
            if (inactiveSeg) {
                this.replayer.play(inactiveSeg.endTimestamp - this.firstTimestamp)
            }
            requestAnimationFrame(checkAndSkip)
        }
        requestAnimationFrame(checkAndSkip)
    }
}
