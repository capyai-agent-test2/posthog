import {
    IconChat,
    IconDashboard,
    IconFlag,
    IconFlask,
    IconGraph,
    IconLive,
    IconNotebook,
    IconPeople,
    IconPerson,
    IconPlaylist,
    IconRewindPlay,
} from '@posthog/icons'

import api from 'lib/api'
import { urls } from 'scenes/urls'

import { NodeKind, QuerySchema } from '~/queries/schema/schema-general'
import { InsightShortId, QueryBasedInsightModel } from '~/types'

import { buildNodeQueryContent } from './nodeBuilders'

export type BackLinkMapper = {
    regex: RegExp
    type: string
    icon: JSX.Element
    getTitle: (id: string) => Promise<string>
}

export const BACKLINK_MAP: BackLinkMapper[] = [
    {
        type: 'dashboards',
        regex: new RegExp(urls.dashboard('([^/]+)')),
        icon: <IconDashboard />,
        getTitle: async (id: string) => {
            const dashboard = await api.dashboards.get(Number(id))
            return dashboard.name || id
        },
    },
    {
        type: 'insights',
        regex: new RegExp(urls.insightView('([^/]+)' as QueryBasedInsightModel['short_id'])),
        icon: <IconGraph />,
        getTitle: async (id: string) => {
            const insight = await api.insights.loadInsight(id as QueryBasedInsightModel['short_id'])
            return insight.results[0]?.name || id
        },
    },
    {
        type: 'feature_flags',
        regex: new RegExp(urls.featureFlag('([^/]+)')),
        icon: <IconFlag />,
        getTitle: async (id: string) => {
            const flag = await api.featureFlags.get(Number(id))
            return flag.name || flag.key || id
        },
    },
    {
        type: 'experiments',
        regex: new RegExp(urls.experiment('([^/]+)')),
        icon: <IconFlask />,
        getTitle: async (id: string) => {
            const experiment = await api.experiments.get(Number(id))
            return experiment.name || id
        },
    },
    {
        type: 'surveys',
        regex: new RegExp(urls.survey('([^/]+)')),
        icon: <IconChat />,
        getTitle: async (id: string) => {
            const survey = await api.surveys.get(id)
            return survey.name || id
        },
    },
    {
        type: 'events',
        regex: new RegExp(urls.eventDefinition('([^/]+)')),
        icon: <IconLive width="1em" height="1em" />,
        getTitle: async (id: string) => {
            const event = await api.eventDefinitions.get({ eventDefinitionId: id })
            return event.name || id
        },
    },
    {
        type: 'persons',
        regex: new RegExp(urls.personByDistinctId('([^/]+)', false)),
        icon: <IconPerson />,
        getTitle: async (id: string) => {
            const response = await api.persons.list({ distinct_id: id })
            return response.results[0]?.name || id
        },
    },
    {
        type: 'cohorts',
        regex: new RegExp(urls.cohort('([^/]+)')),
        icon: <IconPeople />,
        getTitle: async (id: string) => {
            const cohort = await api.cohorts.get(Number(id))
            return cohort.name || id
        },
    },
    {
        type: 'playlist',
        regex: new RegExp(urls.replayPlaylist('([^/]+)')),
        icon: <IconPlaylist />,
        getTitle: async (id: string) => {
            const playlist = await api.recordings.getPlaylist(id)
            return playlist.name || id
        },
    },
    {
        type: 'replay',
        regex: new RegExp(urls.replaySingle('([^/]+)')),
        icon: <IconRewindPlay />,
        getTitle: async (id: string) => {
            return id
        },
    },
    {
        type: 'notebooks',
        regex: new RegExp(urls.notebook('([^/]+)')),
        icon: <IconNotebook />,
        getTitle: async (id: string) => {
            const notebook = await api.notebooks.get(id)
            return notebook.title || 'Untitled'
        },
    },
]

function parseInsightDraftQuery(query: string): QuerySchema | null {
    try {
        return JSON.parse(query) as QuerySchema
    } catch {
        return null
    }
}

export function parseBacklinkToQueryContent(href: string): ReturnType<typeof buildNodeQueryContent> | null {
    const url = new URL(href, window.location.origin)

    if (url.pathname.endsWith(urls.insightNew())) {
        const query = url.searchParams.get('q')
        const parsedQuery = query ? parseInsightDraftQuery(query) : null

        if (parsedQuery) {
            return buildNodeQueryContent(parsedQuery)
        }
    }

    const savedInsightMatch = BACKLINK_MAP.find((config) => config.type === 'insights')?.regex.exec(url.pathname)

    if (savedInsightMatch?.[1] && savedInsightMatch[1] !== 'new') {
        return buildNodeQueryContent({
            kind: NodeKind.SavedInsightNode,
            shortId: savedInsightMatch[1] as InsightShortId,
        })
    }

    return null
}
