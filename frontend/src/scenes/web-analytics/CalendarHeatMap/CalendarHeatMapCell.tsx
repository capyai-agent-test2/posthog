import { Tooltip } from 'lib/lemon-ui/Tooltip'
import { gradateColor, humanFriendlyLargeNumber } from 'lib/utils'
import { cn } from 'lib/utils/css-classes'

interface HeatMapCellProps {
    values: HeatMapValues
    bg: string
    fontSize: number
    tooltip: string
    onClick?: () => void
}

export interface HeatMapValues {
    value: number
    maxValue: number
    minValue: number
}

export function CalendarHeatMapCell({ values, bg, fontSize, tooltip, onClick }: HeatMapCellProps): JSX.Element {
    const { backgroundColor, color } = getBackgroundAndTextColor({ values, backgroundColor: bg })

    return (
        <Tooltip delayMs={100} title={tooltip}>
            <div
                className={cn('CalendarHeatMap__Cell', onClick ? 'cursor-pointer hover:bg-highlight' : '')}
                // eslint-disable-next-line react/forbid-dom-props
                style={{ fontSize, backgroundColor, color }}
                onClick={onClick}
            >
                {values.value == undefined ? '' : humanFriendlyLargeNumber(values.value)}
            </div>
        </Tooltip>
    )
}

export function getBackgroundAndTextColor({
    values,
    backgroundColor,
}: {
    values: HeatMapValues
    backgroundColor: string
}): { backgroundColor: string; color: string } {
    const backgroundColorSaturation = getBackgroundColorSaturation(values)

    const saturatedBackgroundColor = gradateColor(backgroundColor, backgroundColorSaturation, 0.1)

    return {
        backgroundColor: saturatedBackgroundColor,
        color: backgroundColorSaturation > 0.4 ? '#fff' : 'var(--text-3000)',
    }
}

export function getBackgroundColorSaturation(values: HeatMapValues): number {
    if ((values.value <= values.minValue && values.value !== values.maxValue) || values.value === 0) {
        return 0.1
    }

    if (values.value >= values.maxValue) {
        return 1
    }

    if (values.maxValue === 0) {
        return 0
    }

    const scaledValue = Math.log1p(values.value) / Math.log1p(values.maxValue)

    return Math.max(Math.min(0.8, scaledValue), 0.3)
}
