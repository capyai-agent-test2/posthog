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

export function captureScrollableElementBaseline(
    target: EventTarget | null,
    baselines: Map<Element, number>
): Element | null {
    const scrollableElement = findScrollableElement(target)
    if (scrollableElement && !baselines.has(scrollableElement)) {
        baselines.set(scrollableElement, elementScrollTop(scrollableElement))
    }
    return scrollableElement
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
        const nestedScrollBaselines = new Map<Element, number>()

        const captureScrollBaseline = (event: Event): void => {
            captureScrollableElementBaseline(event.target, nestedScrollBaselines)
        }

        const onScroll = (event: Event): void => {
            const scrollableElement = captureScrollableElementBaseline(event.target, nestedScrollBaselines)
            if (!scrollableElement) {
                nestedScrollDelta = 0
                return
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

        document.addEventListener('wheel', captureScrollBaseline, { capture: true, passive: true })
        document.addEventListener('touchstart', captureScrollBaseline, { capture: true, passive: true })
        document.addEventListener('mousedown', captureScrollBaseline, { capture: true, passive: true })
        document.addEventListener('keydown', captureScrollBaseline, { capture: true, passive: true })
        document.addEventListener('scroll', onScroll, { capture: true, passive: true })
        rafId = requestAnimationFrame(onFrame)

        return () => {
            document.removeEventListener('wheel', captureScrollBaseline, { capture: true })
            document.removeEventListener('touchstart', captureScrollBaseline, { capture: true })
            document.removeEventListener('mousedown', captureScrollBaseline, { capture: true })
            document.removeEventListener('keydown', captureScrollBaseline, { capture: true })
            document.removeEventListener('scroll', onScroll, { capture: true })
            if (rafId !== undefined) {
                cancelAnimationFrame(rafId)
            }
        }
    }, [enabled])

    return { innerRef, scrollYRef }
}
