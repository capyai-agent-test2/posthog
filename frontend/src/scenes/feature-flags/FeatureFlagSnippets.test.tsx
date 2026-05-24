import { cleanup, render } from '@testing-library/react'

import {
    AndroidSnippet,
    FlutterSnippet,
    JSSnippet,
    NodeJSSnippet,
    PythonSnippet,
    ReactNativeSnippet,
} from './FeatureFlagSnippets'

jest.mock('lib/components/CodeSnippet', () => ({
    CodeSnippet: ({ children }: { children: string }): JSX.Element => <pre>{children}</pre>,
    Language: new Proxy(
        {},
        {
            get: (_target, property) => property,
        }
    ),
}))

describe('FeatureFlagSnippets', () => {
    afterEach(() => {
        cleanup()
    })

    it.each([
        ['web', <JSSnippet flagKey="my-flag" payload />, 'getFeatureFlagResult', 'getFeatureFlagPayload'],
        ['node', <NodeJSSnippet flagKey="my-flag" payload />, 'getFeatureFlagResult', 'getFeatureFlagPayload'],
        ['python', <PythonSnippet flagKey="my-flag" payload />, 'get_feature_flag_result', 'get_feature_flag_payload'],
        ['android', <AndroidSnippet flagKey="my-flag" payload />, 'getFeatureFlagResult', 'getFeatureFlagPayload'],
        ['flutter', <FlutterSnippet flagKey="my-flag" payload />, 'getFeatureFlagResult', 'getFeatureFlagPayload'],
        [
            'react native',
            <ReactNativeSnippet flagKey="my-flag" payload />,
            'getFeatureFlagResult',
            'getFeatureFlagPayload',
        ],
    ])('uses feature flag result for %s payload snippets', (_label, component, expectedMethod, deprecatedMethod) => {
        const { container } = render(component)

        expect(container.textContent).toContain(expectedMethod)
        expect(container.textContent).not.toContain(deprecatedMethod)
    })
})
