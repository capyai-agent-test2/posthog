import { resetContext } from 'kea'
import { expectLogic, testUtilsPlugin } from 'kea-test-utils'

import { useMocks } from '~/mocks/jest'
import { performQuery } from '~/queries/query'
import { NodeKind } from '~/queries/schema/schema-general'
import { initKeaTests } from '~/test/init'

import { workflowLogic } from '../../../workflowLogic'
import { hogFlowEditorTestLogic, SAMPLE_EVENT_SELECT } from './hogFlowEditorTestLogic'

jest.mock('~/queries/query', () => {
    const actual = jest.requireActual('~/queries/query')
    return {
        ...actual,
        performQuery: jest.fn().mockResolvedValue({ results: [] }),
    }
})

describe('hogFlowEditorTestLogic', () => {
    let logic: ReturnType<typeof hogFlowEditorTestLogic.build>

    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        resetContext({
            plugins: [testUtilsPlugin],
        })
        useMocks({
            get: {
                '/api/environments/@current/hog_flows/test-workflow/': {
                    id: 'test-workflow',
                    team_id: 1,
                    name: 'Test Workflow',
                    status: 'draft',
                    actions: [],
                    edges: [],
                },
            },
        })
        initKeaTests()
    })

    describe('accumulatedVariables reducer', () => {
        beforeEach(() => {
            const workflowLogicInstance = workflowLogic({ id: 'test-workflow' })
            workflowLogicInstance.mount()
            logic = hogFlowEditorTestLogic({ id: 'test-workflow' })
            logic.mount()
        })

        it('starts with empty object', () => {
            expect(logic.values.accumulatedVariables).toEqual({})
        })

        it('merges variables from test result', async () => {
            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'next-step',
                    variables: { has_chat_runs: 'true', count: 5 },
                })
            }).toMatchValues({
                accumulatedVariables: { has_chat_runs: 'true', count: 5 },
            })
        })

        it('accumulates variables across multiple test results', async () => {
            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-2',
                    variables: { var1: 'value1' },
                })
            }).toMatchValues({
                accumulatedVariables: { var1: 'value1' },
            })

            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-3',
                    variables: { var2: 'value2' },
                })
            }).toMatchValues({
                accumulatedVariables: { var1: 'value1', var2: 'value2' },
            })
        })

        it('overwrites existing variables with new values', async () => {
            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-2',
                    variables: { counter: 1 },
                })
            }).toMatchValues({
                accumulatedVariables: { counter: 1 },
            })

            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-3',
                    variables: { counter: 2 },
                })
            }).toMatchValues({
                accumulatedVariables: { counter: 2 },
            })
        })

        it('does not modify state when test result has no variables', async () => {
            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-2',
                    variables: { existing: 'value' },
                })
            }).toMatchValues({
                accumulatedVariables: { existing: 'value' },
            })

            const stateBefore = logic.values.accumulatedVariables

            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-3',
                    // No variables in this result
                })
            })

            // State reference should be the same (no unnecessary re-render)
            expect(logic.values.accumulatedVariables).toBe(stateBefore)
        })

        it('resets on resetAccumulatedVariables action', async () => {
            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-2',
                    variables: { var1: 'value1' },
                })
            }).toMatchValues({
                accumulatedVariables: { var1: 'value1' },
            })

            await expectLogic(logic, () => {
                logic.actions.resetAccumulatedVariables()
            }).toMatchValues({
                accumulatedVariables: {},
            })
        })

        it('resets on loadSampleGlobals action', async () => {
            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-2',
                    variables: { var1: 'value1' },
                })
            }).toMatchValues({
                accumulatedVariables: { var1: 'value1' },
            })

            await expectLogic(logic, () => {
                logic.actions.loadSampleGlobals({})
            }).toMatchValues({
                accumulatedVariables: {},
            })
        })

        it('resets on loadSampleEventByName action', async () => {
            await expectLogic(logic, () => {
                logic.actions.setTestResult({
                    status: 'success',
                    nextActionId: 'step-2',
                    variables: { var1: 'value1' },
                })
            }).toMatchValues({
                accumulatedVariables: { var1: 'value1' },
            })

            await expectLogic(logic, () => {
                logic.actions.loadSampleEventByName({ eventName: '$pageview' })
            }).toMatchValues({
                accumulatedVariables: {},
            })
        })
    })

    describe('sample event query shape', () => {
        beforeEach(() => {
            const workflowLogicInstance = workflowLogic({ id: 'test-workflow' })
            workflowLogicInstance.mount()
            logic = hogFlowEditorTestLogic({ id: 'test-workflow' })
            logic.mount()
        })

        it('requests only the fields needed to build test globals', async () => {
            ;(performQuery as jest.Mock).mockResolvedValueOnce({
                results: [['event-uuid', 'distinct-id', '2024-01-01T00:00:00Z', '', '$pageview', {}, 'person-1', {}]],
            })

            await expectLogic(logic, () => {
                logic.actions.loadSampleEventByName({ eventName: '$pageview' })
            })

            expect(performQuery).toHaveBeenCalledWith(
                expect.objectContaining({
                    kind: NodeKind.EventsQuery,
                    select: [...SAMPLE_EVENT_SELECT],
                })
            )
        })

        it('rotates to a different matching event when the current one is already loaded', async () => {
            ;(performQuery as jest.Mock).mockResolvedValueOnce({
                results: [
                    ['event-1', 'distinct-id-1', '2024-01-01T00:00:00Z', '', '$pageview', {}, 'person-1', {}],
                    ['event-2', 'distinct-id-2', '2024-01-02T00:00:00Z', '', '$pageview', {}, 'person-2', {}],
                ],
            })

            logic.actions.setSampleGlobals(
                JSON.stringify({
                    event: {
                        uuid: 'event-1',
                        distinct_id: 'distinct-id-1',
                        timestamp: '2024-01-01T00:00:00Z',
                        elements_chain: '',
                        event: '$pageview',
                        properties: {},
                    },
                })
            )

            await expectLogic(logic, () => {
                logic.actions.loadSampleGlobals()
            }).toMatchValues({
                sampleGlobals: expect.objectContaining({
                    event: expect.objectContaining({
                        uuid: 'event-2',
                    }),
                }),
            })
        })
    })
})
