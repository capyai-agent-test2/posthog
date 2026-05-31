import './LemonMarkdown.scss'
import 'katex/dist/katex.min.css'

import clsx from 'clsx'
import React, { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { CodeSnippet, getLanguage, Language } from 'lib/components/CodeSnippet'
import { RichContentMention } from 'lib/components/RichContentEditor/RichContentNodeMention'
import { LemonCheckbox } from 'lib/lemon-ui/LemonCheckbox'

import { Link } from '../Link'
import remarkMentions from './mention'

interface LemonMarkdownContainerProps {
    children: React.ReactNode
    className?: string
}

function LemonMarkdownContainer({ children, className }: LemonMarkdownContainerProps): JSX.Element {
    return <div className={clsx('LemonMarkdown', className)}>{children}</div>
}

export interface LemonMarkdownProps {
    children: string
    /** Whether headings should just be <strong> text. Recommended for item descriptions. */
    lowKeyHeadings?: boolean
    /** Whether to disable the docs sidebar panel behavior and always open links in a new tab */
    disableDocsRedirect?: boolean
    className?: string
    wrapCode?: boolean
    /** Whether to generate id attributes on heading elements for anchor linking. */
    generateHeadingIds?: boolean
    /**
     * Optional renderer for ` ```mermaid ` code blocks. When omitted, mermaid fences fall back to a
     * plain text CodeSnippet — this is the default so the mermaid library only ships in bundles
     * that opt in (see `LemonMarkdownWithMermaid`).
     */
    renderMermaid?: (code: string) => React.ReactNode
}

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

function canStartIndentedCodeBlockAfterLine(line: string, wasIndentedCodeBlock: boolean): boolean {
    const trimmedLine = line.trim()
    const lineWithUpToThreeSpaces = line.match(/^ {0,3}(.*)$/)?.[1] ?? line

    return (
        wasIndentedCodeBlock ||
        trimmedLine === '' ||
        /^#{1,6}(?:\s|$)/.test(lineWithUpToThreeSpaces) ||
        /^(?:[-*_])(?:\s*\1){2,}\s*$/.test(lineWithUpToThreeSpaces) ||
        /^>/.test(lineWithUpToThreeSpaces)
    )
}

export function normalizeLatexMathDelimiters(markdown: string): string {
    let normalized = ''
    let inlineCodeTicks = 0
    let fencedCodeTicks = ''
    let atLineStart = true
    let canStartIndentedCodeBlock = true
    let inIndentedCodeBlock = false
    let currentLine = ''

    for (let index = 0; index < markdown.length; index++) {
        const currentCharacter = markdown[index]
        const nextCharacter = markdown[index + 1]
        const remainingLine = markdown.slice(index)
        const fenceMatch = remainingLine.match(/^([ \t]*)(`{3,}|~{3,})/)
        const indentedCodeBlockMatch = remainingLine.match(/^(?: {4}|\t)[^\n]*(?:\n|$)/)
        const isBlankLine = atLineStart && /^[ \t]*(?:\n|$)/.test(remainingLine)

        if (atLineStart && !inlineCodeTicks && fenceMatch) {
            const fence = fenceMatch[2]
            if (!fencedCodeTicks) {
                fencedCodeTicks = fence
            } else if (fence[0] === fencedCodeTicks[0] && fence.length >= fencedCodeTicks.length) {
                fencedCodeTicks = ''
            }
            normalized += fenceMatch[1] + fence
            index += fenceMatch[0].length - 1
            atLineStart = false
            currentLine += fenceMatch[0]
            continue
        }

        if (
            atLineStart &&
            !inlineCodeTicks &&
            !fencedCodeTicks &&
            indentedCodeBlockMatch &&
            (canStartIndentedCodeBlock || inIndentedCodeBlock)
        ) {
            normalized += indentedCodeBlockMatch[0]
            index += indentedCodeBlockMatch[0].length - 1
            inIndentedCodeBlock = true
            canStartIndentedCodeBlock = canStartIndentedCodeBlockAfterLine(indentedCodeBlockMatch[0], true)
            currentLine = ''
            atLineStart = true
            continue
        }

        if (atLineStart && !isBlankLine && !indentedCodeBlockMatch) {
            inIndentedCodeBlock = false
        }

        if (!fencedCodeTicks && currentCharacter === '`') {
            let tickCount = 1
            while (markdown[index + tickCount] === '`') {
                tickCount++
            }
            inlineCodeTicks = inlineCodeTicks === tickCount ? 0 : inlineCodeTicks || tickCount
            normalized += '`'.repeat(tickCount)
            currentLine += '`'.repeat(tickCount)
            index += tickCount - 1
            atLineStart = false
            continue
        }

        if (!fencedCodeTicks && !inlineCodeTicks && currentCharacter === '\\') {
            if (nextCharacter === '(' || nextCharacter === ')') {
                normalized += '$'
                currentLine += '$'
                index++
                atLineStart = false
                continue
            }
            if (nextCharacter === '[' || nextCharacter === ']') {
                normalized += '$$'
                currentLine += '$$'
                index++
                atLineStart = false
                continue
            }
        }

        normalized += currentCharacter
        currentLine += currentCharacter
        if (currentCharacter === '\n') {
            atLineStart = true
            canStartIndentedCodeBlock = canStartIndentedCodeBlockAfterLine(currentLine, inIndentedCodeBlock)
            currentLine = ''
        } else {
            atLineStart = false
        }
    }

    return normalized
}

/** Generate a URL-safe slug from heading text content. */
export function slugifyHeading(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export function extractTextFromChildren(children: React.ReactNode): string {
    if (typeof children === 'string') {
        return children
    }
    if (typeof children === 'number') {
        return String(children)
    }
    if (Array.isArray(children)) {
        return children.map(extractTextFromChildren).join('')
    }
    if (children && typeof children === 'object' && 'props' in children) {
        return extractTextFromChildren((children as React.ReactElement).props.children)
    }
    return ''
}

const LemonMarkdownRenderer = memo(function LemonMarkdownRenderer({
    children,
    lowKeyHeadings = false,
    disableDocsRedirect = false,
    wrapCode = false,
    generateHeadingIds = false,
    renderMermaid,
}: LemonMarkdownProps): JSX.Element {
    const components = useMemo(
        () => ({
            a: ({ href, children }: any): JSX.Element => (
                <Link to={href} target="_blank" targetBlankIcon disableDocsPanel={disableDocsRedirect}>
                    {children}
                </Link>
            ),
            code: ({ className, children, node, ...rest }: any): JSX.Element => {
                const languageMatch = /language-(\w+)/.exec(className || '')
                const isBlock = node?.position?.start?.line !== node?.position?.end?.line || languageMatch
                if (isBlock) {
                    const value = String(children).replace(/\n$/, '')
                    if (renderMermaid && languageMatch && languageMatch[1].toLowerCase() === 'mermaid') {
                        return <>{renderMermaid(value)}</>
                    }
                    const language = languageMatch ? getLanguage(languageMatch[1]) : Language.Text
                    return (
                        <CodeSnippet language={language} wrap={wrapCode} compact>
                            {value}
                        </CodeSnippet>
                    )
                }
                return (
                    <code className={className} {...rest}>
                        {children}
                    </code>
                )
            },
            pre: ({ children }: any): JSX.Element => {
                // In v9, block code renders as <pre><code>. We handle rendering
                // in the code component, so just pass children through.
                return <>{children}</>
            },
            span: ({ className, ...props }: any): JSX.Element => {
                if (className === 'ph-mention') {
                    return <RichContentMention id={Number(props['data-mention-id'])} />
                }
                return <span className={className} {...props} />
            },
            li: ({ children, node }: any): JSX.Element => {
                const isTaskItem = node?.properties?.className?.includes('task-list-item')
                if (isTaskItem) {
                    // remark-gfm v4 renders task list items with an <input> checkbox child.
                    // We replace it with our LemonCheckbox.
                    const inputChild = node?.children?.find(
                        (child: any) => child.tagName === 'input' && child.properties?.type === 'checkbox'
                    )
                    const checked = inputChild?.properties?.checked ?? false
                    // Filter out the default checkbox input from rendered children
                    const filteredChildren = React.Children.toArray(children).filter(
                        (child: any) => !(child?.type === 'input' && child?.props?.type === 'checkbox')
                    )
                    return (
                        <li className="LemonMarkdown__task">
                            <LemonCheckbox checked={checked} disabledReason="Read-only for display" size="small" />
                            <span className="LemonMarkdown__task-content">{filteredChildren}</span>
                        </li>
                    )
                }
                return <li>{children}</li>
            },
            ...(lowKeyHeadings
                ? Object.fromEntries(
                      HEADING_TAGS.map((tag) => [
                          tag,
                          ({ children }: any): JSX.Element => (
                              <strong className="LemonMarkdown__low-key-heading">{children}</strong>
                          ),
                      ])
                  )
                : generateHeadingIds
                  ? Object.fromEntries(
                        HEADING_TAGS.map((tag) => [
                            tag,
                            ({ children }: any): JSX.Element => {
                                const id = slugifyHeading(extractTextFromChildren(children))
                                return React.createElement(tag, { id }, children)
                            },
                        ])
                    )
                  : {}),
        }),
        [disableDocsRedirect, lowKeyHeadings, wrapCode, generateHeadingIds, renderMermaid]
    )
    const normalizedChildren = useMemo(() => normalizeLatexMathDelimiters(children), [children])

    return (
        /* eslint-disable-next-line react/forbid-elements */
        <ReactMarkdown
            components={components}
            remarkPlugins={[remarkGfm, remarkMath, remarkMentions]}
            rehypePlugins={[rehypeKatex]}
            skipHtml
        >
            {normalizedChildren}
        </ReactMarkdown>
    )
})

/** Beautifully rendered Markdown. */
function LemonMarkdownComponent({
    children,
    lowKeyHeadings = false,
    disableDocsRedirect = false,
    wrapCode = false,
    generateHeadingIds = false,
    renderMermaid,
    className,
}: LemonMarkdownProps): JSX.Element {
    return (
        <LemonMarkdownContainer className={className}>
            <LemonMarkdownRenderer
                lowKeyHeadings={lowKeyHeadings}
                disableDocsRedirect={disableDocsRedirect}
                wrapCode={wrapCode}
                generateHeadingIds={generateHeadingIds}
                renderMermaid={renderMermaid}
            >
                {children}
            </LemonMarkdownRenderer>
        </LemonMarkdownContainer>
    )
}

export const LemonMarkdown = Object.assign(LemonMarkdownComponent, {
    Container: LemonMarkdownContainer,
    Renderer: LemonMarkdownRenderer,
})
