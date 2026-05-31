import '@testing-library/jest-dom'

import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import { SceneDescription, SceneName } from './SceneTitleSection'

jest.mock('posthog-js')
jest.mock('~/layout/navigation-3000/navigationLogic', () => ({
    navigation3000Logic: {},
}))
jest.mock('~/layout/navigation-3000/sidepanel/sidePanelStateLogic', () => ({
    sidePanelStateLogic: {},
}))
jest.mock('~/layout/navigation/Breadcrumbs/breadcrumbsLogic', () => ({
    breadcrumbsLogic: {},
}))
jest.mock('~/layout/panel-layout/ProjectTree/defaultTree', () => ({
    ProductIconWrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
    iconForType: () => null,
}))
jest.mock('scenes/max/useMaxTool', () => ({
    useMaxTool: () => ({}),
}))
jest.mock('../sceneLayoutLogic', () => ({
    sceneLayoutLogic: {},
}))

describe('SceneTitleSection fields', () => {
    it('does not overwrite a dirty description when saved props arrive while editing', () => {
        const onChange = jest.fn()
        const { rerender } = render(
            <SceneDescription
                description="Original description"
                onChange={onChange}
                canEdit
                saveOnBlur
                renameDebounceMs={0}
            />
        )

        fireEvent.click(screen.getByText('Original description').closest('button')!)
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Second edit' } })

        rerender(
            <SceneDescription description="First edit" onChange={onChange} canEdit saveOnBlur renameDebounceMs={0} />
        )

        expect(screen.getByRole('textbox')).toHaveValue('Second edit')
    })

    it('does not overwrite a dirty name when saved props arrive while editing', () => {
        const onChange = jest.fn()
        const { rerender } = render(
            <SceneName name="Original name" onChange={onChange} canEdit saveOnBlur renameDebounceMs={0} />
        )

        fireEvent.click(screen.getByText('Original name').closest('button')!)
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Second edit' } })

        rerender(<SceneName name="First edit" onChange={onChange} canEdit saveOnBlur renameDebounceMs={0} />)

        expect(screen.getByRole('textbox')).toHaveValue('Second edit')
    })
})
