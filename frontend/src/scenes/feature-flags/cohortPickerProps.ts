import { TaxonomicFilterGroupType } from 'lib/components/TaxonomicFilter/types'

import { PropertyOperator } from '~/types'

/**
 * Workflow triggers still treat cohort filters as key-only rows with an
 * implicit `in` operator, so the picker hides any recent `not_in` cohort
 * filters that would be impossible to edit there.
 */
export const COHORTS_KEY_ONLY_PICKER_PROPS = {
    excludedOperators: { [TaxonomicFilterGroupType.Cohorts]: [PropertyOperator.NotIn] },
    selectingKeyOnly: { [TaxonomicFilterGroupType.Cohorts]: true },
}
