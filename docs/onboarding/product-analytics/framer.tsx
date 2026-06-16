import { OnboardingComponentsContext, createInstallation } from 'scenes/onboarding/OnboardingDocsContentWrapper'

import { StepDefinition } from '../steps'

export const getFramerSteps = (ctx: OnboardingComponentsContext): StepDefinition[] => {
    const { CodeBlock, Markdown, dedent } = ctx

    return [
        {
            title: 'Copy the web snippet',
            badge: 'required',
            content: (
                <>
                    <Markdown>First, copy your PostHog web snippet:</Markdown>
                    <CodeBlock
                        blocks={[
                            {
                                language: 'html',
                                file: 'HTML',
                                code: dedent`
                                    <script>
                                        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group identify setPersonProperties setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags resetGroups onFeatureFlags addFeatureFlagsHandler onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                                        posthog.init('<ph_project_token>', {
                                            api_host: '<ph_client_api_host>',
                                            defaults: '2026-01-30'
                                        })
                                    </script>
                                `,
                            },
                        ]}
                    />
                </>
            ),
        },
        {
            title: 'Add to Framer',
            badge: 'required',
            content: (
                <>
                    <Markdown>
                        Go to your Framer project settings by clicking the gear in the top right. If you haven't
                        already, sign up for at least the **Mini** site plan. This enables you to add custom code. Then:
                    </Markdown>
                    <Markdown>
                        {`1. Go to the **General** tab in site settings.
2. Scroll down to the **Custom Code** section.
3. Under **End of <head> tag**, paste your PostHog snippet.
4. Press save, and then publish your site.`}
                    </Markdown>
                </>
            ),
        },
        {
            title: 'Send events',
            content: (
                <>
                    <Markdown>
                        To capture custom events, create a Framer code component rather than a code override. In the
                        Assets tab, click the plus icon next to Code, choose **New component**, and use this component:
                    </Markdown>
                    <CodeBlock
                        blocks={[
                            {
                                language: 'javascript',
                                file: 'CaptureButton.jsx',
                                code: dedent`
                                    export default function CaptureButton() {
                                        const handleClick = () => {
                                            window.posthog.capture('clicked_button', {
                                                $set_once: { clicked_homepage_button: true },
                                            })
                                        }

                                        return (
                                            <button id="capture-button" onClick={handleClick}>
                                                Click me
                                            </button>
                                        )
                                    }
                                `,
                            },
                        ]}
                    />
                    <Markdown>
                        Save the file, drag the new `CaptureButton` from the Code tab onto your page, publish your site,
                        and then click the button to see the event in PostHog.
                    </Markdown>
                </>
            ),
        },
    ]
}

export const FramerInstallation = createInstallation(getFramerSteps)
