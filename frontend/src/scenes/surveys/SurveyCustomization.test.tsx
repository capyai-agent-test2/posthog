import '@testing-library/jest-dom'

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import { Survey, SurveyQuestionType, SurveySchedule, SurveyType } from '~/types'

import { Customization } from './survey-appearance/SurveyCustomization'

jest.mock('kea', () => ({
    useValues: (logic: { values: Record<string, unknown> }) => logic.values,
}))

jest.mock('scenes/surveys/surveysLogic', () => ({
    surveysLogic: {
        values: {
            surveysStylingAvailable: true,
        },
    },
}))

jest.mock('lib/components/UpgradeModal/upgradeModalLogic', () => ({
    upgradeModalLogic: {
        values: {
            guardAvailableFeature: (_feature: unknown, callback: () => void) => callback(),
        },
    },
}))

jest.mock('lib/components/PayGateMini/PayGateMini', () => ({
    PayGateMini: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

jest.mock('scenes/surveys/survey-appearance/SurveyAppearanceSections', () => ({
    SurveyColorsAppearance: () => <div>Colors section</div>,
    SurveyContainerAppearance: () => <div>Layout section</div>,
}))

jest.mock('scenes/surveys/survey-appearance/SurveyAppearanceModal', () => ({
    SurveyAppearanceModal: () => <div>Appearance modal</div>,
}))

jest.mock('scenes/surveys/wizard/SurveyThemeSelector', () => ({
    SurveyThemeSelector: () => <div>Theme section</div>,
}))

const createApiSurvey = (): Survey =>
    ({
        id: 'test-survey',
        name: 'API survey',
        description: '',
        type: SurveyType.API,
        questions: [
            {
                type: SurveyQuestionType.Open,
                question: 'What do you think?',
                description: '',
                buttonText: 'Submit',
            },
        ],
        conditions: null,
        appearance: {
            whiteLabel: false,
        },
        archived: false,
        schedule: SurveySchedule.Once,
    }) as Survey

describe('SurveyCustomization', () => {
    afterEach(() => {
        cleanup()
    })

    it('shows the branding toggle without web-only styling controls for API surveys', () => {
        render(
            <Customization
                survey={createApiSurvey()}
                hasRatingButtons={false}
                hasPlaceholderText
                hasBranchingLogic={false}
                onAppearanceChange={() => {}}
                validationErrors={null}
            />
        )

        expect(screen.getByLabelText('Hide PostHog branding')).toBeInTheDocument()
        expect(screen.queryByText('Theme')).not.toBeInTheDocument()
        expect(screen.queryByText('Theme section')).not.toBeInTheDocument()
        expect(screen.queryByText('Colors section')).not.toBeInTheDocument()
        expect(screen.queryByText('Layout section')).not.toBeInTheDocument()
    })
})
