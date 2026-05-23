import { LemonBanner } from '@posthog/lemon-ui'

import { RestrictionScope, useRestrictedArea } from 'lib/components/RestrictedArea'
import { TeamMembershipLevel } from 'lib/constants'
import { Link } from 'lib/lemon-ui/Link'
import { urls } from 'scenes/urls'

import { TeamSettingToggle } from '../components/TeamSettingToggle'

export function IPCapture(): JSX.Element {
    const restrictedReason = useRestrictedArea({
        scope: RestrictionScope.Project,
        minimumAccessLevel: TeamMembershipLevel.Admin,
    })

    return (
        <>
            <LemonBanner type="info" className="mb-4">
                Discarding client IP data removes stored <code>$ip</code>, but GeoIP and other IP-based
                transformations can still use the IP before it is discarded. If you do not want location enrichment,
                disable the GeoIP transformation in <Link to={urls.transformations()}>Transformations</Link>, or use{' '}
                <Link to={urls.settings('environment-web-analytics', 'cookieless-server-hash-mode')}>
                    Cookieless server hash mode
                </Link>{' '}
                to strip the IP before transformations run.
            </LemonBanner>
            <TeamSettingToggle field="anonymize_ips" label="Discard client IP data" disabledReason={restrictedReason} />
        </>
    )
}
