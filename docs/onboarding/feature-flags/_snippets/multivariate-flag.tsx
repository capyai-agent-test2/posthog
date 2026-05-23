import { memo } from 'react'

import { useMDXComponents } from 'scenes/onboarding/OnboardingDocsContentWrapper'

export const MultivariateFlagSnippet = memo(({ language = 'javascript' }: { language?: string }): JSX.Element => {
    const { CodeBlock, dedent } = useMDXComponents()

    const snippets: Record<string, string> = {
        javascript: dedent`
            const flagResult = posthog.getFeatureFlagResult('flag-key')
            if (flagResult?.variant == 'variant-key') { // replace 'variant-key' with the key of your variant
                // Do something differently for this user
                // Optional: fetch the payload
                const matchedFlagPayload = flagResult.payload
            }
        `,
        react: dedent`
            import { useFeatureFlagVariantKey } from '@posthog/react'

            function App() {
                const variantKey = useFeatureFlagVariantKey('show-welcome-message')
                let welcomeMessage = ''
                if (variantKey === 'variant-a') {
                    welcomeMessage = 'Welcome to the Alpha!'
                } else if (variantKey === 'variant-b') {
                    welcomeMessage = 'Welcome to the Beta!'
                }
                return (
                    <div className="App">
                        {welcomeMessage ? (
                            <div>
                                <h1>{welcomeMessage}</h1>
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
            if (flagResult?.variant === 'variant-key') {  // replace 'variant-key' with the key of your variant
                // Do something differently for this user
                // Optional: fetch the payload
                const matchedFlagPayload = flagResult.payload
            }
        `,
        python: dedent`
            flag_result = posthog.get_feature_flag_result('flag-key', 'distinct_id_of_your_user')
            if flag_result and flag_result.variant == 'variant-key': # replace 'variant-key' with the key of your variant
                # Do something differently for this user
                # Optional: fetch the payload
                matched_flag_payload = flag_result.payload
            `,
        php: dedent`
            $enabledVariant = PostHog::getFeatureFlag('flag-key', 'distinct_id_of_your_user')
            if ($enabledVariant === 'variant-key') { # replace 'variant-key' with the key of your variant
                # Do something differently for this user
            }
        `,
        ruby: dedent`
            flag_result = posthog.get_feature_flag_result('flag-key', 'distinct_id_of_your_user')
            if flag_result&.variant == 'variant-key' # replace 'variant-key' with the key of your variant
                # Do something differently for this user
                # Optional: fetch the payload
                matched_flag_payload = flag_result.payload
            end
        `,
        go: dedent`
            enabledVariant, err := client.GetFeatureFlag(posthog.FeatureFlagPayload{
                Key:        "flag-key",
                DistinctId: "distinct_id_of_your_user",
            })
            if err != nil {
                // Handle error (e.g. capture error and fallback to default behaviour)
            }
            if enabledVariant == "variant-key" { // replace 'variant-key' with the key of your variant
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
