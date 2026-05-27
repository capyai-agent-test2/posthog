import { MOCK_DEFAULT_USER } from 'lib/api.mock'

import { expectLogic } from 'kea-test-utils'

import { userLogic } from 'scenes/userLogic'

import { initKeaTests } from '~/test/init'
import { AvailableFeature } from '~/types'

import { columnConfiguratorLogic } from './columnConfiguratorLogic'

describe('columnConfiguratorLogic', () => {
    let logic: ReturnType<typeof columnConfiguratorLogic.build>

    const startingColumns = ['a', 'b', 'ant', 'aardvark']

    beforeEach(() => {
        window.POSTHOG_APP_CONTEXT = {
            ...window.POSTHOG_APP_CONTEXT,
            current_user: MOCK_DEFAULT_USER,
        } as any
        initKeaTests()
        userLogic.mount()
        logic = columnConfiguratorLogic({ key: 'uniqueKey', columns: startingColumns, setColumns: () => {} })
        logic.mount()
    })

    it('starts with expected defaults', async () => {
        await expectLogic(logic).toMatchValues({
            modalVisible: false,
            columns: startingColumns,
        })
    })

    it('can show modal', async () => {
        await expectLogic(logic, () => logic.actions.showModal()).toMatchValues({
            modalVisible: true,
        })
    })

    it('can hide the modal', async () => {
        await expectLogic(logic, () => logic.actions.hideModal()).toMatchValues({
            modalVisible: false,
        })
    })

    it('sets modal to hidden when user has selected and saved columns', async () => {
        await expectLogic(logic, () => {
            logic.actions.showModal()
            logic.actions.setColumns(['a'])
            logic.actions.save()
        }).toMatchValues({
            modalVisible: false,
        })
    })

    it('cannot duplicate columns', async () => {
        await expectLogic(logic, () => {
            logic.actions.selectColumn('added')
            logic.actions.selectColumn('added')
        }).toMatchValues({
            columns: ['a', 'b', 'ant', 'aardvark', 'added'],
        })
    })

    describe('saveAsDefaultDisabledReason', () => {
        it('blocks event definition default columns without the add-on', async () => {
            const eventDefinitionLogic = columnConfiguratorLogic({
                key: 'eventDefinitionUniqueKey',
                columns: startingColumns,
                setColumns: () => {},
                context: { type: 'event_definition', eventDefinitionId: 'abc' },
            })
            eventDefinitionLogic.mount()

            await expectLogic(eventDefinitionLogic).toMatchValues({
                saveAsDefaultDisabledReason:
                    'Saving default columns for event types requires the Data management add-on.',
            })

            eventDefinitionLogic.unmount()
        })

        it('allows event definition default columns with the add-on', async () => {
            userLogic.actions.loadUserSuccess({
                ...MOCK_DEFAULT_USER,
                organization: {
                    ...MOCK_DEFAULT_USER.organization,
                    available_product_features: [{ key: AvailableFeature.INGESTION_TAXONOMY, name: 'Data management' }],
                },
            } as any)

            const eventDefinitionLogic = columnConfiguratorLogic({
                key: 'eventDefinitionFeatureUniqueKey',
                columns: startingColumns,
                setColumns: () => {},
                context: { type: 'event_definition', eventDefinitionId: 'abc' },
            })
            eventDefinitionLogic.mount()

            await expectLogic(eventDefinitionLogic).toMatchValues({
                saveAsDefaultDisabledReason: null,
            })

            eventDefinitionLogic.unmount()
        })
    })
})
