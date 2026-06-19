import { actions, afterMount, connect, kea, listeners, path, reducers, selectors } from 'kea'
import { loaders } from 'kea-loaders'

import api from 'lib/api'
import { toParams } from 'lib/utils'
import { getCurrentTeamId } from 'lib/utils/getAppContext'
import { organizationLogic } from 'scenes/organizationLogic'
import { projectLogic } from 'scenes/projectLogic'
import { teamLogic } from 'scenes/teamLogic'

import { FeatureFlagType, OrganizationFeatureFlag, OrganizationType } from '~/types'

import type { projectsGridLogicType } from './projectsGridLogicType'

export const PAGE_SIZE = 25

export interface LoadFlagsResult {
    offset: number
    search: string
    count: number
    next: string | null
    results: ProjectsGridFlagRow[]
}

const storageKey = (teamId: number): string => `ff-projects-grid.picked-teams.${teamId}`

interface TeamFlagsPageResponse {
    count: number
    next: string | null
    results: FeatureFlagType[]
}

export interface ProjectsGridFlagRow extends FeatureFlagType {
    source_team_id: number
}

export const projectsGridLogic = kea<projectsGridLogicType>([
    path(['scenes', 'feature-flags', 'projects-grid', 'projectsGridLogic']),
    connect(() => ({
        values: [
            teamLogic,
            ['currentTeamId'],
            organizationLogic,
            ['currentOrganization'],
            projectLogic,
            ['currentProjectId'],
        ],
    })),
    actions({
        setSearch: (search: string) => ({ search }),
        loadMoreFlags: true,
        enqueueSiblingFetches: (keys: string[]) => ({ keys }),
        startSiblingFetch: (flagKey: string) => ({ flagKey }),
        siblingsLoaded: (flagKey: string, siblings: OrganizationFeatureFlag[]) => ({
            flagKey,
            siblings,
        }),
        siblingsFailed: (flagKey: string) => ({ flagKey }),
        setPickedTeamIds: (teamIds: number[]) => ({ teamIds }),
        hydratePickedTeamIds: (teamIds: number[]) => ({ teamIds }),
        resetPickedTeamIds: true,
    }),
    reducers({
        search: ['', { setSearch: (_, { search }) => search }],
        flags: [
            [] as ProjectsGridFlagRow[],
            {
                loadFlagsPageSuccess: (state, { flagsPage }: { flagsPage: LoadFlagsResult }) =>
                    flagsPage.offset === 0 ? flagsPage.results : mergeFlagRowsByKey(state, flagsPage.results),
                setSearch: () => [],
                setPickedTeamIds: () => [],
                hydratePickedTeamIds: () => [],
                resetPickedTeamIds: () => [],
            },
        ],
        flagsOffset: [
            0,
            {
                loadFlagsPageSuccess: (_, { flagsPage }: { flagsPage: LoadFlagsResult }) =>
                    flagsPage.offset + PAGE_SIZE,
                setSearch: () => 0,
                setPickedTeamIds: () => 0,
                hydratePickedTeamIds: () => 0,
                resetPickedTeamIds: () => 0,
            },
        ],
        flagsHasMore: [
            true,
            {
                loadFlagsPageSuccess: (_, { flagsPage }: { flagsPage: LoadFlagsResult }) => flagsPage.next !== null,
                setSearch: () => true,
                setPickedTeamIds: () => true,
                hydratePickedTeamIds: () => true,
                resetPickedTeamIds: () => true,
            },
        ],
        siblingsByFlagKey: [
            {} as Record<string, OrganizationFeatureFlag[]>,
            {
                siblingsLoaded: (state, { flagKey, siblings }) => ({ ...state, [flagKey]: siblings }),
            },
        ],
        siblingsLoadingKeys: [
            [] as string[],
            {
                startSiblingFetch: (state, { flagKey }) => [...state, flagKey],
                siblingsLoaded: (state, { flagKey }) => state.filter((k) => k !== flagKey),
                siblingsFailed: (state, { flagKey }) => state.filter((k) => k !== flagKey),
                setSearch: () => [],
                setPickedTeamIds: () => [],
                hydratePickedTeamIds: () => [],
                resetPickedTeamIds: () => [],
            },
        ],
        siblingQueue: [
            [] as string[],
            {
                enqueueSiblingFetches: (state, { keys }) => {
                    const dedup = keys.filter((k) => !state.includes(k))
                    return [...state, ...dedup]
                },
                startSiblingFetch: (state, { flagKey }) => state.filter((k) => k !== flagKey),
                setSearch: () => [],
                setPickedTeamIds: () => [],
                hydratePickedTeamIds: () => [],
                resetPickedTeamIds: () => [],
            },
        ],
        pickedTeamIds: [
            [] as number[],
            {
                setPickedTeamIds: (_, { teamIds }) => teamIds,
                hydratePickedTeamIds: (_, { teamIds }) => teamIds,
                resetPickedTeamIds: () => [],
            },
        ],
    }),
    loaders(({ values }) => ({
        flagsPage: [
            null as LoadFlagsResult | null,
            {
                loadFlagsPage: async ({ offset, search }: { offset: number; search: string }) => {
                    const visibleProjects = getVisibleProjects(values)
                    if (visibleProjects.length === 0) {
                        return { offset, search, count: 0, next: null, results: [] }
                    }

                    const params = toParams({ limit: PAGE_SIZE, offset, search })
                    const responses = await Promise.all(
                        visibleProjects.map(async ({ teamId, projectId }) => ({
                            teamId,
                            response: await api.get<TeamFlagsPageResponse>(
                                `api/projects/${projectId}/feature_flags/?${params}`
                            ),
                        }))
                    )

                    const results: ProjectsGridFlagRow[] = []
                    const seenKeys = new Set<string>()

                    for (const { teamId, response } of responses) {
                        for (const flag of response.results) {
                            if (seenKeys.has(flag.key)) {
                                continue
                            }
                            seenKeys.add(flag.key)
                            results.push({ ...flag, source_team_id: teamId })
                        }
                    }

                    return {
                        offset,
                        search,
                        count: results.length,
                        next: responses.some(({ response }) => response.next !== null) ? 'next' : null,
                        results,
                    }
                },
            },
        ],
    })),
    selectors({
        visibleColumns: [
            (s) => [s.currentTeamId, s.pickedTeamIds],
            (currentTeamId, pickedTeamIds): number[] =>
                currentTeamId ? [currentTeamId, ...pickedTeamIds.filter((id) => id !== currentTeamId)] : pickedTeamIds,
        ],
        accessibleTeamIds: [
            (s) => [s.currentOrganization],
            (org: OrganizationType | null): Set<number> => new Set((org?.teams ?? []).map((t) => t.id)),
        ],
    }),
    listeners(({ actions, values }) => ({
        loadMoreFlags: () => {
            if (values.flagsHasMore && !values.flagsPageLoading) {
                actions.loadFlagsPage({ offset: values.flagsOffset, search: values.search })
            }
        },
        setSearch: async ({ search }, breakpoint) => {
            await breakpoint(300)
            actions.loadFlagsPage({ offset: 0, search })
        },
        loadFlagsPageSuccess: ({ flagsPage }: { flagsPage: LoadFlagsResult }) => {
            const newKeys = flagsPage.results.map((f) => f.key).filter((k) => !values.siblingsByFlagKey[k])
            if (newKeys.length) {
                actions.enqueueSiblingFetches(newKeys)
            }
        },
        enqueueSiblingFetches: async () => {
            await drainQueue(values, actions)
        },
        siblingsLoaded: async () => {
            await drainQueue(values, actions)
        },
        siblingsFailed: async () => {
            await drainQueue(values, actions)
        },
        setPickedTeamIds: ({ teamIds }) => {
            localStorage.setItem(storageKey(getCurrentTeamId()), JSON.stringify(teamIds))
            actions.loadFlagsPage({ offset: 0, search: values.search })
        },
        resetPickedTeamIds: () => {
            localStorage.removeItem(storageKey(getCurrentTeamId()))
            actions.loadFlagsPage({ offset: 0, search: values.search })
        },
    })),
    afterMount(({ actions }) => {
        const raw = localStorage.getItem(storageKey(getCurrentTeamId()))
        if (raw) {
            try {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'number')) {
                    actions.hydratePickedTeamIds(parsed)
                }
            } catch {
                // ignore malformed entry
            }
        }
        actions.loadFlagsPage({ offset: 0, search: '' })
    }),
])

async function drainQueue(
    values: ReturnType<typeof projectsGridLogic.build>['values'],
    actions: ReturnType<typeof projectsGridLogic.build>['actions']
): Promise<void> {
    if (values.siblingsLoadingKeys.length > 0) {
        return
    }
    if (values.siblingQueue.length === 0) {
        return
    }

    const nextKey = values.siblingQueue[0]
    actions.startSiblingFetch(nextKey)

    try {
        const orgId = values.currentOrganization?.id
        if (!orgId) {
            actions.siblingsFailed(nextKey)
            return
        }
        // The wrapper is typed as `OrganizationFeatureFlags` (a legacy name), but the
        // endpoint actually returns a list of `OrganizationFeatureFlag`. Narrow once here.
        const siblings = (await api.organizationFeatureFlags.get(
            orgId,
            nextKey
        )) as unknown as OrganizationFeatureFlag[]
        actions.siblingsLoaded(nextKey, siblings)
    } catch {
        actions.siblingsFailed(nextKey)
    }
}

function getVisibleProjects(
    values: ReturnType<typeof projectsGridLogic.build>['values']
): Array<{ teamId: number; projectId: number }> {
    if (!values.currentTeamId || !values.currentProjectId) {
        return []
    }

    const projectIdByTeamId = new Map(
        (values.currentOrganization?.teams ?? []).map((team) => [team.id, team.project_id])
    )

    return [values.currentTeamId, ...values.pickedTeamIds.filter((teamId) => teamId !== values.currentTeamId)]
        .map((teamId) => ({
            teamId,
            projectId: teamId === values.currentTeamId ? values.currentProjectId : projectIdByTeamId.get(teamId),
        }))
        .filter((project): project is { teamId: number; projectId: number } => typeof project.projectId === 'number')
}

function mergeFlagRowsByKey(state: ProjectsGridFlagRow[], incoming: ProjectsGridFlagRow[]): ProjectsGridFlagRow[] {
    const seenKeys = new Set(state.map((flag) => flag.key))
    const nextRows = [...state]

    for (const flag of incoming) {
        if (seenKeys.has(flag.key)) {
            continue
        }
        seenKeys.add(flag.key)
        nextRows.push(flag)
    }

    return nextRows
}
