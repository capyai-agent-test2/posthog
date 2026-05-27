import { ActorsQuery, DataNode, NodeKind } from '~/queries/schema/schema-general'

export function isPersonActorsQuery(source: DataNode): source is ActorsQuery {
    return source.kind === NodeKind.ActorsQuery && !source.source
}

export function getExportSourceForActorsQuery(source: ActorsQuery, onlySelectedColumns: boolean): ActorsQuery {
    if (onlySelectedColumns || !isPersonActorsQuery(source)) {
        return source
    }

    return {
        ...source,
        select: ['*'],
        orderBy: source.orderBy ?? (source.select?.includes('created_at') ? ['created_at DESC'] : ['id ASC']),
    }
}
