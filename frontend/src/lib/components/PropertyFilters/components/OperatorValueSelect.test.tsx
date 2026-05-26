import '@testing-library/jest-dom'

import { render } from '@testing-library/react'
import { Provider } from 'kea'

import { initKeaTests } from '~/test/init'
import { PropertyFilterType, PropertyOperator, PropertyType } from '~/types'

import { OperatorValueSelect } from './OperatorValueSelect'

const propertyValueMock = jest.fn(() => null)

jest.mock('./PropertyValue', () => ({
    PropertyValue: (props: unknown) => {
        propertyValueMock(props)
        return null
    },
}))

describe('OperatorValueSelect', () => {
    beforeEach(() => {
        initKeaTests()
        propertyValueMock.mockClear()
    })

    it('passes local data warehouse person property types through to PropertyValue', () => {
        render(
            <Provider>
                <OperatorValueSelect
                    editable
                    type={PropertyFilterType.DataWarehousePersonProperty}
                    propertyKey="company.age"
                    operator={PropertyOperator.Exact}
                    value={[]}
                    onChange={jest.fn()}
                    propertyDefinitions={[
                        {
                            id: 'company.age',
                            name: 'company: age',
                            property_type: PropertyType.Numeric,
                        },
                    ]}
                />
            </Provider>
        )

        expect(propertyValueMock).toHaveBeenCalledWith(
            expect.objectContaining({
                propertyKey: 'company.age',
                propertyTypeOverride: PropertyType.Numeric,
                type: PropertyFilterType.DataWarehousePersonProperty,
            })
        )
    })
})
