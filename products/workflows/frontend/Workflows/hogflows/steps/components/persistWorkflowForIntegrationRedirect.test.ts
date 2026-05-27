import { HogFunctionTemplateType } from '~/types'

import { HogFlow, HogFlowSchedule } from '../../types'
import { persistWorkflowForIntegrationRedirect } from './persistWorkflowForIntegrationRedirect'

const makeWorkflow = (overrides: Partial<HogFlow> = {}): HogFlow => ({
    id: 'new',
    name: 'New workflow',
    actions: [
        {
            id: 'trigger_node',
            type: 'trigger',
            name: 'Trigger',
            description: '',
            created_at: 0,
            updated_at: 0,
            config: { type: 'event', filters: {} },
        },
        {
            id: 'exit_node',
            type: 'exit',
            name: 'Exit',
            description: '',
            created_at: 0,
            updated_at: 0,
            config: { reason: 'Default exit' },
        },
    ],
    edges: [{ from: 'trigger_node', to: 'exit_node', type: 'continue' }],
    conversion: { window_minutes: null, filters: [] },
    exit_condition: 'exit_only_at_end',
    version: 1,
    status: 'draft',
    team_id: 1,
    trigger: { type: 'event', filters: {} } as HogFlow['trigger'],
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
})

describe('persistWorkflowForIntegrationRedirect', () => {
    const templatesById: Record<string, HogFunctionTemplateType> = {}
    const schedule: HogFlowSchedule = { id: 'sched-1', rrule: 'RRULE:FREQ=DAILY', starts_at: '2026-05-01T00:00:00Z' }

    it('creates a new workflow and rewrites the redirect target to the saved workflow URL', async () => {
        const setWorkflowValues = jest.fn()
        const saveDraftWorkflow = jest.fn().mockResolvedValue(makeWorkflow({ id: 'wf-123' }))

        const next = await persistWorkflowForIntegrationRedirect({
            workflow: makeWorkflow(),
            hogFunctionTemplatesById: templatesById,
            redirectUrl: '/project/1/workflows/new?integration_target=slack#step',
            currentTab: 'workflow',
            setWorkflowValues,
            saveDraftWorkflow,
        })

        expect(saveDraftWorkflow).toHaveBeenCalledTimes(1)
        expect(setWorkflowValues).toHaveBeenCalledWith(expect.objectContaining({ id: 'wf-123' }))
        expect(next).toBe('/workflows/wf-123/workflow?integration_target=slack#step')
    })

    it('flushes draft edits for existing workflows without changing the redirect target', async () => {
        const setWorkflowValues = jest.fn()
        const saveDraftWorkflow = jest.fn().mockResolvedValue(makeWorkflow({ id: 'wf-456', name: 'Saved draft' }))
        const savePendingSchedule = jest.fn()

        const next = await persistWorkflowForIntegrationRedirect({
            workflow: makeWorkflow({ id: 'wf-456', name: 'Edited draft' }),
            hogFunctionTemplatesById: templatesById,
            redirectUrl: '/project/1/workflows/wf-456/workflow?integration_target=slack',
            currentTab: 'workflow',
            pendingSchedule: { rrule: 'RRULE:FREQ=WEEKLY', starts_at: '2026-06-01T00:00:00Z' },
            currentSchedule: schedule,
            setWorkflowValues,
            saveDraftWorkflow,
            savePendingSchedule,
        })

        expect(saveDraftWorkflow).toHaveBeenCalledTimes(1)
        expect(savePendingSchedule).toHaveBeenCalledWith(
            'wf-456',
            { rrule: 'RRULE:FREQ=WEEKLY', starts_at: '2026-06-01T00:00:00Z' },
            schedule
        )
        expect(setWorkflowValues).toHaveBeenCalledWith(expect.objectContaining({ id: 'wf-456', name: 'Saved draft' }))
        expect(next).toBe('/project/1/workflows/wf-456/workflow?integration_target=slack')
    })

    it('skips persistence for template edit redirects', async () => {
        const setWorkflowValues = jest.fn()
        const saveDraftWorkflow = jest.fn()

        const next = await persistWorkflowForIntegrationRedirect({
            workflow: makeWorkflow({ id: 'tpl-123' }),
            hogFunctionTemplatesById: templatesById,
            redirectUrl: '/project/1/workflows/new?integration_target=slack',
            currentTab: 'workflow',
            shouldSaveDraft: false,
            setWorkflowValues,
            saveDraftWorkflow,
        })

        expect(saveDraftWorkflow).not.toHaveBeenCalled()
        expect(setWorkflowValues).not.toHaveBeenCalled()
        expect(next).toBe('/project/1/workflows/new?integration_target=slack')
    })
})
