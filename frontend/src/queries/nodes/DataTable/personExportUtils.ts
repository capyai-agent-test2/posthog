import api from 'lib/api'

import { ActorsQuery, DataNode, NodeKind } from '~/queries/schema/schema-general'
import { AnyPropertyFilter } from '~/types'

export function isPersonActorsQuery(source: DataNode): source is ActorsQuery {
    return source.kind === NodeKind.ActorsQuery && !source.source
}

function getCombinedProperties(source: ActorsQuery): AnyPropertyFilter[] {
    return [
        ...(Array.isArray(source.fixedProperties) ? source.fixedProperties : []),
        ...(Array.isArray(source.properties) ? source.properties : []),
    ]
}

export function getPersonActorsExportPath(source: ActorsQuery): string {
    const properties = getCombinedProperties(source)
    const cohortFilter = properties.find(
        (property) => property.type === 'cohort' && property.key === 'id' && typeof property.value === 'number'
    )
    const remainingProperties = properties.filter((property) => property !== cohortFilter)
    const params = {
        ...(remainingProperties.length ? { properties: remainingProperties } : {}),
        ...(source.search ? { search: source.search } : {}),
        ...(source.limit ? { limit: source.limit } : {}),
    }

    if (cohortFilter) {
        return api.cohorts.determineListUrl(cohortFilter.value, params)
    }

    return api.persons.determineListUrl(params)
}
