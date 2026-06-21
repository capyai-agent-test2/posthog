import { HogQLVariable } from '~/queries/schema/schema-general'

export function getSharedVariablesOverrideUrl(variables: HogQLVariable[], currentUrl: string): string {
    const url = new URL(currentUrl)
    const variablesOverride = variables.reduce(
        (acc, cur) => {
            if (cur.variableId) {
                acc[cur.variableId] = {
                    variableId: cur.variableId,
                    value: cur.value,
                    code_name: cur.code_name,
                    isNull: cur.isNull,
                }
            }

            return acc
        },
        {} as Record<string, HogQLVariable>
    )

    if (Object.keys(variablesOverride).length > 0) {
        url.searchParams.set('variables_override', JSON.stringify(variablesOverride))
    } else {
        url.searchParams.delete('variables_override')
    }

    return url.toString()
}
