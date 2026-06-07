import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { initKeaTests } from '~/test/init'

import { validateSavedQueryName } from '../../../scenes/data-warehouse/saved_queries/savedQueryNameValidation'
import { LemonField } from '../LemonField'
import { LemonInput } from '../LemonInput'
import { LemonFormDialog } from './LemonDialog'

describe('LemonFormDialog', () => {
    beforeEach(() => {
        initKeaTests()
    })

    it('keeps validation isolated between nested form dialogs', async () => {
        const saveView = jest.fn()
        const createFolder = jest.fn()

        render(
            <>
                <LemonFormDialog
                    title="Save as view"
                    initialValues={{ viewName: 'valid_view' }}
                    errors={{ viewName: validateSavedQueryName }}
                    content={
                        <LemonField name="viewName">
                            <LemonInput placeholder="Please enter the name of the view" autoFocus />
                        </LemonField>
                    }
                    onSubmit={saveView}
                    primaryButtonProps={{ children: 'Save view' }}
                />
                <LemonFormDialog
                    title="New folder"
                    initialValues={{ folderName: 'New folder' }}
                    errors={{ folderName: (name) => (!name?.trim() ? 'You must enter a folder name' : undefined) }}
                    content={
                        <LemonField name="folderName">
                            <LemonInput placeholder="Enter a folder name" autoFocus />
                        </LemonField>
                    }
                    onSubmit={createFolder}
                    primaryButtonProps={{ children: 'Create folder' }}
                />
            </>
        )

        await userEvent.clear(screen.getByDisplayValue('valid_view'))
        await userEvent.type(screen.getByPlaceholderText('Please enter the name of the view'), 'invalid name')
        const saveViewButton = screen.getByRole('button', { name: 'Save view' })

        expect(saveViewButton).toHaveAttribute('aria-disabled', 'true')
        await userEvent.click(saveViewButton)

        expect(saveView).not.toHaveBeenCalled()
        expect(createFolder).not.toHaveBeenCalled()
    })
})
