import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'

import { ErrorTrackingRelease } from 'lib/components/Errors/types'

import { ReleasePopoverContent } from './ReleasesPopoverContent'

describe('ReleasePopoverContent', () => {
    it('shows the full version for timestamp-based releases', () => {
        const release: ErrorTrackingRelease = {
            id: 'test-release',
            version: '2026.02.230940',
            created_at: '2026-02-23T09:40:00Z',
            project: 'app',
        }

        render(<ReleasePopoverContent release={release} />)

        expect(screen.getByText('2026.02.230940')).toBeInTheDocument()
        expect(screen.queryByText('2026.02.23…')).not.toBeInTheDocument()
    })
})
