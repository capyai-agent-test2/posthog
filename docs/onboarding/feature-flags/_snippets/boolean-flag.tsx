import { memo } from 'react'

import { useMDXComponents } from 'scenes/onboarding/OnboardingDocsContentWrapper'

export const BooleanFlagSnippet = memo(({ language = 'javascript' }: { language?: string }): JSX.Element => {
    const { CodeBlock, dedent } = useMDXComponents()

    const snippets: Record<string, string> = {
        javascript: dedent`
            const flagResult = posthog.getFeatureFlagResult('flag-key')
            if (flagResult?.enabled) {
                // Do something differently for this user
                // Optional: fetch the payload
                const matchedFlagPayload = flagResult.payload
            }
        `,
        react: dedent`
            import { useFeatureFlagEnabled } from '@posthog/react'

            function App() {
                const showWelcomeMessage = useFeatureFlagEnabled('flag-key')
                const payload = useFeatureFlagPayload('flag-key')
                return (
                    <div className="App">
                        {showWelcomeMessage ? (
                            <div>
                                <h1>Welcome!</h1>
                                <p>Thanks for trying out our feature flags.</p>
                            </div>
                        ) : (
                            <div>
                                <h2>No welcome message</h2>
                                <p>Because the feature flag evaluated to false.</p>
                            </div>
                        )}
                    </div>
                )
            }
        `,
        'node.js': dedent`
            const flagResult = await client.getFeatureFlagResult('flag-key', 'distinct_id_of_your_user')
            if (flagResult?.enabled) {
                // Your code if the flag is enabled
                // Optional: fetch the payload
                const matchedFlagPayload = flagResult.payload
            }
        `,
        python: dedent`
            flag_result = posthog.get_feature_flag_result('flag-key', 'distinct_id_of_your_user')
            if flag_result and flag_result.enabled:
                # Do something differently for this user
                # Optional: fetch the payload
                matched_flag_payload = flag_result.payload
        `,
        php: dedent`
            $isMyFlagEnabledForUser = PostHog::isFeatureEnabled('flag-key', 'distinct_id_of_your_user')
            if ($isMyFlagEnabledForUser) {
                // Do something differently for this user
            }
        `,
        ruby: dedent`
            flag_result = posthog.get_feature_flag_result('flag-key', 'distinct_id_of_your_user')
            if flag_result&.enabled
                # Do something differently for this user
                # Optional: fetch the payload
                matched_flag_payload = flag_result.payload
            end
        `,
        go: dedent`
            isMyFlagEnabled, err := client.IsFeatureEnabled(posthog.FeatureFlagPayload{
                Key:        "flag-key",
                DistinctId: "distinct_id_of_your_user",
            })
            if err != nil {
                // Handle error (e.g. capture error and fallback to default behaviour)
            }
            if isMyFlagEnabled == true {
                // Do something differently for this user
            }
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
