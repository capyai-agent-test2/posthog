import { buildTableQueryUrl } from 'products/data_warehouse/frontend/utils'

export function getSourceAccessMethod(
    wizardAccessMethod: 'warehouse' | 'direct',
    sourceAccessMethod?: 'warehouse' | 'direct'
): 'warehouse' | 'direct' {
    return sourceAccessMethod ?? wizardAccessMethod
}

export function getPreviewQueryUrl(
    tableName: string,
    accessMethod: 'warehouse' | 'direct' | undefined,
    sourceId?: string | null
): string {
    return buildTableQueryUrl(tableName, accessMethod === 'direct' ? (sourceId ?? undefined) : undefined)
}

export function getSourceErrorMessage(
    source: { latest_error?: string | null; status?: string | null } | null
): string | null {
    if (!source || source.status !== 'Error') {
        return null
    }

    return source.latest_error ?? 'We hit an error while syncing this source.'
}
