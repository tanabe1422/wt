// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CollapsibleSidebar, SidebarProvider } from '../layout/CollapsibleSidebar'
import { SidebarToggleButton } from '../toolbar/SidebarToggleButton'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  localStorage.clear()
})

function renderSidebar() {
  return render(
    <SidebarProvider>
      <SidebarToggleButton />
      <CollapsibleSidebar>
        <div>sidebar body</div>
      </CollapsibleSidebar>
    </SidebarProvider>,
  )
}

describe('CollapsibleSidebar', () => {
  it('collapses and expands, persisting collapsed state', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const sidebar =
      screen.getByText('sidebar body').closest('[data-collapsed]') ??
      screen.getByText('sidebar body').parentElement?.parentElement
    expect(sidebar).toBeTruthy()
    expect(sidebar).not.toHaveAttribute('data-collapsed')

    await user.click(screen.getByRole('button', { name: 'サイドパネルを閉じる' }))
    expect(localStorage.getItem('wt-manager.sidebarCollapsed')).toBe('1')
    expect(screen.getByRole('button', { name: 'サイドパネルを開く' })).toBeInTheDocument()

    const collapsedRoot = document.querySelector('[data-collapsed]')
    expect(collapsedRoot).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'サイドパネルを開く' }))
    expect(localStorage.getItem('wt-manager.sidebarCollapsed')).toBe('0')
    expect(screen.getByRole('button', { name: 'サイドパネルを閉じる' })).toBeInTheDocument()
  })

  it('restores collapsed state from localStorage on mount', () => {
    localStorage.setItem('wt-manager.sidebarCollapsed', '1')
    renderSidebar()

    expect(screen.getByRole('button', { name: 'サイドパネルを開く' })).toBeInTheDocument()
    expect(document.querySelector('[data-collapsed]')).toBeTruthy()
  })
})
