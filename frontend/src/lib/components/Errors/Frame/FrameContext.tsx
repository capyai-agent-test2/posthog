import { Language } from 'lib/components/CodeSnippet'

import { ErrorTrackingStackFrameContext } from '../types'
import { FrameContextLine } from './FrameContextLine'

type OrderedFrameContextLine = ErrorTrackingStackFrameContext['line'] & { highlight: boolean }

export function getOrderedFrameContextLines(context: ErrorTrackingStackFrameContext): OrderedFrameContextLine[] {
    return [
        ...context.before.map((line) => ({ ...line, highlight: false })),
        { ...context.line, highlight: true },
        ...context.after.map((line) => ({ ...line, highlight: false })),
    ].sort((a, b) => a.number - b.number)
}

export function FrameContext({
    context,
    language,
}: {
    context: ErrorTrackingStackFrameContext
    language: Language
}): JSX.Element {
    const lines = getOrderedFrameContextLines(context)
    return (
        <div className="overflow-x-auto [&_span]:!whitespace-pre">
            <div className="w-fit min-w-full">
                {lines.map(({ highlight, ...line }, index) => (
                    <FrameContextLine
                        key={`${line.number}-${index}`}
                        lines={[line]}
                        language={language}
                        highlight={highlight}
                    />
                ))}
            </div>
        </div>
    )
}
