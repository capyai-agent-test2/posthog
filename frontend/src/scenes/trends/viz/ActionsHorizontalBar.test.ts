import { buildHorizontalBarDataset } from './ActionsHorizontalBar'

describe('buildHorizontalBarDataset', () => {
    it('normalizes formula results without actions', () => {
        const dataset = buildHorizontalBarDataset(
            [
                {
                    label: 'Formula (A)',
                    aggregated_value: 42,
                    action: null,
                },
            ],
            ['#ff0000'],
            (item) => item.label
        )

        expect(dataset.actions).toEqual([undefined])
    })
})
