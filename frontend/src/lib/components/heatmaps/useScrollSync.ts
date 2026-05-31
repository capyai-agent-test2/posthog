import { PostHog } from 'posthog-js'
import { useEffect, useRef } from 'react'

import { toolbarConfigLogic } from '~/toolbar/toolbarConfigLogic'

const SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'scroll', 'overlay'])

function elementScrollTop(element: Element): number {
    return element instanceof HTMLElement ? element.scrollTop : 0
}

export function isScrollableElement(element: Element): boolean {
    if (!(element instanceof HTMLElement) || element.scrollHeight <= element.clientHeight) {
        return false
    }

    const { overflowY } = window.getComputedStyle(element)
    return SCROLLABLE_OVERFLOW_VALUES.has(overflowY)
}

export function findScrollableElement(target: EventTarget | null): Element | null {
    if (!(target instanceof Element)) {
        return null
    }

    let element: Element | null = target
    while (element && element !== document.body && element !== document.documentElement) {
        if (isScrollableElement(element)) {
            return element
        }
        element = element.parentElement
    }

    return null
}

export function collectScrollableElementBaselines(root: ParentNode = document): Map<Element, number> {
    const baselines = new Map<Element, number>()
    root.querySelectorAll('*').forEach((element) => {
        if (isScrollableElement(element)) {
            baselines.set(element, elementScrollTop(element))
        }
    })
    return baselines
}

export function useScrollSync(enabled: boolean = true): {
    innerRef: React.RefObject<HTMLDivElement>
    scrollYRef: React.MutableRefObject<number>
} {
    const innerRef = useRef<HTMLDivElement>(null)
    const scrollYRef = useRef<number>(0)

    useEffect(() => {
        if (!enabled) {
            scrollYRef.current = 0
            return
        }

        let posthogInstance: PostHog | null = null
        try {
            posthogInstance = toolbarConfigLogic.values.posthog
        } catch {
            // toolbarConfigLogic not mounted — fall back to window.scrollY
        }

        let rafId: number | undefined
        let lastScrollY = -1
        let nestedScrollDelta = 0
        const nestedScrollBaselines = collectScrollableElementBaselines()

        const onScroll = (event: Event): void => {
            const scrollableElement = findScrollableElement(event.target)
            if (!scrollableElement) {
                nestedScrollDelta = 0
                return
            }

            if (!nestedScrollBaselines.has(scrollableElement)) {
                nestedScrollBaselines.set(scrollableElement, elementScrollTop(scrollableElement))
            }

            nestedScrollDelta =
                elementScrollTop(scrollableElement) - (nestedScrollBaselines.get(scrollableElement) ?? 0)
        }

        const onFrame = (): void => {
            const scrollY = (posthogInstance?.scrollManager?.scrollY() ?? window.scrollY) + nestedScrollDelta
            if (scrollY !== lastScrollY) {
                lastScrollY = scrollY
                scrollYRef.current = scrollY
                const inner = innerRef.current
                if (inner) {
                    inner.style.transform = `translateY(${-scrollY}px)`
                }
            }
            rafId = requestAnimationFrame(onFrame)
        }

        document.addEventListener('scroll', onScroll, { capture: true, passive: true })
        rafId = requestAnimationFrame(onFrame)

        return () => {
            document.removeEventListener('scroll', onScroll, { capture: true })
            if (rafId !== undefined) {
                cancelAnimationFrame(rafId)
            }
        }
    }, [enabled])

    return { innerRef, scrollYRef }
}
