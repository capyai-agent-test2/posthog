import { useValues } from 'kea'
import { router } from 'kea-router'
import { useState } from 'react'

import { LemonBanner, LemonButton, LemonInput, LemonModal, lemonToast } from '@posthog/lemon-ui'

import api from 'lib/api'
import { ApiError } from 'lib/api-error'
import { organizationLogic } from 'scenes/organizationLogic'
import { urls } from 'scenes/urls'

import type { PluginType } from '~/types'

export function InstallLegacyPluginButton(): JSX.Element {
    const { currentOrganizationId } = useValues(organizationLogic)
    const [isOpen, setIsOpen] = useState(false)
    const [pluginUrl, setPluginUrl] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const onClose = (): void => {
        if (isSubmitting) {
            return
        }
        setIsOpen(false)
        setPluginUrl('')
    }

    const onSubmit = async (): Promise<void> => {
        if (!currentOrganizationId || !pluginUrl.trim()) {
            return
        }

        setIsSubmitting(true)
        try {
            const plugin = await api.create<PluginType>(`api/organizations/${currentOrganizationId}/plugins/`, {
                url: pluginUrl.trim(),
            })
            setIsSubmitting(false)
            setIsOpen(false)
            setPluginUrl('')
            router.actions.push(urls.legacyPluginNew(plugin.id.toString()))
        } catch (error) {
            lemonToast.error(error instanceof ApiError ? error.detail : 'Failed to install plugin')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <LemonButton type="secondary" size="small" onClick={() => setIsOpen(true)}>
                Install custom plugin
            </LemonButton>
            <LemonModal
                isOpen={isOpen}
                onClose={onClose}
                title="Install custom plugin"
                width={600}
                footer={
                    <>
                        <LemonButton
                            type="secondary"
                            onClick={onClose}
                            disabledReason={isSubmitting ? 'Installing…' : undefined}
                        >
                            Cancel
                        </LemonButton>
                        <LemonButton
                            type="primary"
                            onClick={onSubmit}
                            loading={isSubmitting}
                            disabledReason={!pluginUrl.trim() ? 'Enter a plugin URL or local file path' : undefined}
                        >
                            Install
                        </LemonButton>
                    </>
                }
            >
                <div className="deprecated-space-y-3">
                    <LemonBanner type="info">
                        Local development plugins can be loaded from a server-side path like
                        <code> file:/absolute/path/to/plugin</code>. GitHub, GitLab, and npm package URLs still work
                        too.
                    </LemonBanner>
                    <LemonInput
                        value={pluginUrl}
                        onChange={setPluginUrl}
                        placeholder="file:/absolute/path/to/plugin"
                        autoFocus
                        disabled={isSubmitting}
                    />
                </div>
            </LemonModal>
        </>
    )
}
