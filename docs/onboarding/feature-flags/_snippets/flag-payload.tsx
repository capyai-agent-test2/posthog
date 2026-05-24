import { memo } from 'react'

import { useMDXComponents } from 'scenes/onboarding/OnboardingDocsContentWrapper'

export const FlagPayloadSnippet = memo(({ language = 'javascript' }: { language?: string }): JSX.Element => {
    const { CodeBlock, dedent } = useMDXComponents()

    const snippets: Record<string, string> = {
        javascript: dedent`
            const flagResult = posthog.getFeatureFlagResult('flag-key')
            const matchedFlagPayload = flagResult?.payload
        `,
        react: dedent`
            import { useFeatureFlagPayload, useFeatureFlagEnabled } from '@posthog/react'

            function App() {
                const variant = useFeatureFlagEnabled('show-welcome-message')
                const payload = useFeatureFlagPayload('show-welcome-message')
                return (
                    <>
                        {variant ? (
                            <div className="welcome-message">
                                <h2>{payload?.welcomeTitle}</h2>
                                <p>{payload?.welcomeMessage}</p>
                            </div>
                        ) : (
                            <div>
                                <h2>No custom welcome message</h2>
                                <p>Because the feature flag evaluated to false.</p>
                            </div>
                        )}
                    </>
                )
            }
        `,
        'node.js': dedent`
            const flagResult = await client.getFeatureFlagResult('flag-key', 'distinct_id_of_your_user')
            const matchedFlagPayload = flagResult?.payload
        `,
        python: dedent`
            flag_result = posthog.get_feature_flag_result('flag-key', 'distinct_id_of_your_user')
            matched_flag_payload = flag_result.payload if flag_result else None
        `,
        php: dedent`
            // Payloads are returned as part of the flag evaluation
        `,
        ruby: dedent`
            flag_result = posthog.get_feature_flag_result('flag-key', 'distinct_id_of_your_user')
            matched_flag_payload = flag_result&.payload
        `,
        go: dedent`
            // Payloads are returned as part of the flag evaluation
        `,
    }

    const langMap: Record<string, string> = {
        javascript: 'javascript',
        react: 'jsx',
        'node.js': 'javascript',
        python: 'python',
        php: 'php',
        ruby: 'ruby',
        go: 'go',
    }

    return <CodeBlock language={langMap[language] || 'javascript'} code={snippets[language] || snippets.javascript} />
})
