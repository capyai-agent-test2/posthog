import { Node, NodeViewProps, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import clsx from 'clsx'
import { useValues } from 'kea'
import { router } from 'kea-router'
import { useEffect } from 'react'

import { IconLogomark, IconUndo } from '@posthog/icons'
import { LemonButton, Link } from '@posthog/lemon-ui'

import { openNotebook } from '~/models/notebooksModel'

import { notebookLogic } from '../Notebook/notebookLogic'
import { NotebookNodeType, NotebookTarget } from '../types'
import { BACKLINK_MAP, parseBacklinkToQueryContent } from './NotebookNodeBacklink.utils'
import { posthogNodePasteRule } from './utils'

const Component = (props: NodeViewProps): JSX.Element => {
    const { shortId, isEditable } = useValues(notebookLogic)
    const { location } = useValues(router)

    const href: string = props.node.attrs.href ?? ''
    const hrefWithoutQuery: string = href.split(/[?#]/)[0]
    const queryContent = parseBacklinkToQueryContent(href)

    const backLinkConfig = BACKLINK_MAP.find((config) => config.regex.test(hrefWithoutQuery))
    const matchedId = backLinkConfig?.regex.exec(hrefWithoutQuery)?.[1]
    const derivedText: string = props.node.attrs.title || props.node.attrs.href
    const isViewing = location.pathname === href

    useEffect(() => {
        if (props.node.attrs.title || !backLinkConfig || !matchedId) {
            return
        }

        void backLinkConfig
            .getTitle(matchedId)
            .then((title) => {
                props.updateAttributes({
                    title,
                })
            })
            .catch((e) => {
                console.error(e)
            })
        // oxlint-disable-next-line exhaustive-deps
    }, [props.node.attrs.title])

    const convertBackToChart = (): void => {
        const pos = props.getPos?.()

        if (typeof pos !== 'number' || !queryContent) {
            return
        }

        props.editor
            .chain()
            .focus()
            .insertContentAt({ from: pos, to: pos + props.node.nodeSize }, queryContent)
            .run()
    }

    return (
        <NodeViewWrapper
            as="span"
            className={clsx(
                'Backlink inline-flex items-center gap-1',
                isViewing && 'Backlink--active',
                props.selected && 'Backlink--selected'
            )}
        >
            <Link
                to={href}
                onClick={() => void openNotebook(shortId, NotebookTarget.Popover)}
                className="deprecated-space-x-1"
            >
                <span>{backLinkConfig?.icon || <IconLogomark />}</span>
                <span className="Backlink__label">{derivedText}</span>
            </Link>
            {isEditable && queryContent ? (
                <LemonButton
                    size="xsmall"
                    icon={<IconUndo />}
                    tooltip="Convert back to chart"
                    onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        convertBackToChart()
                    }}
                />
            ) : null}
        </NodeViewWrapper>
    )
}

export const NotebookNodeBacklink = Node.create({
    name: NotebookNodeType.Backlink,
    inline: true,
    group: 'inline',
    atom: true,

    addAttributes() {
        return {
            href: { default: '' },
            type: {},
            title: {},
        }
    },

    parseHTML() {
        return [{ tag: NotebookNodeType.Backlink }]
    },

    renderHTML({ HTMLAttributes }) {
        return [NotebookNodeType.Backlink, mergeAttributes(HTMLAttributes)]
    },

    addNodeView() {
        return ReactNodeViewRenderer(Component)
    },

    addPasteRules() {
        return [
            posthogNodePasteRule({
                find: '(.+)',
                editor: this.editor,
                type: this.type,
                getAttributes: async (match) => {
                    return { href: match[1] }
                },
            }),
        ]
    },
})
