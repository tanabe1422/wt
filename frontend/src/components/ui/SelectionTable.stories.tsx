import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import {
  SelectionTable,
  SelectionTableList,
  SelectionTableRow,
  selectionTableStyles as st,
  type SelectionTableVariant,
} from './SelectionTable'

const meta = {
  title: 'UI/SelectionTable',
  component: SelectionTableList,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof SelectionTableList>

export default meta
type Story = StoryObj<typeof meta>

const SAMPLE_ROWS = [
  { id: 'a', name: 'feature/selection-table', ahead: 3, locked: false },
  { id: 'b', name: 'main', ahead: 0, locked: true },
  { id: 'c', name: 'chore/cleanup-dialogs', ahead: 12, locked: false },
  { id: 'd', name: 'fix/stash-preview-pane', ahead: 1, locked: false },
  { id: 'e', name: 'refactor/remote-cleanup-table', ahead: 7, locked: false },
]

const VARIANT_NOTES: Record<SelectionTableVariant, { title: string; summary: string }> = {
  current: {
    title: '採用 · Dense + Soft header',
    summary: 'D の高密度レイアウトに、E のヘッダー色（slate-50）を合わせた採用案。整理ダイアログのデフォルト。',
  },
  legacy: {
    title: '参考 · Legacy（旧現状）',
    summary: '変更前の slate インセット枠 + slate-100 ヘッダー。',
  },
  flat: {
    title: 'B · Flat minimal',
    summary: '白地・ヘッダーは下線のみ。枠の存在感を抑え、ダイアログ本体に溶け込む。',
  },
  zebra: {
    title: 'C · Zebra',
    summary: '行のゼブラでスキャンしやすく。罫線はほぼなくし、ストライプで区切る。',
  },
  dense: {
    title: 'D · Dense（= 採用）',
    summary: '余白とフォントを詰めた高密度。ヘッダー色は E と同じ slate-50。',
  },
  soft: {
    title: 'E · Soft select',
    summary: 'ホバー/フォーカスを穏やかな青で強調。行クリックで選ぶ操作が主のとき向き。',
  },
}

function VariantDemo({
  variant,
  focusedId = 'c',
}: {
  variant: SelectionTableVariant
  focusedId?: string | null
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['a', 'd']))
  const deletable = SAMPLE_ROWS.filter((row) => !row.locked)
  const allSelected =
    deletable.length > 0 && deletable.every((row) => selected.has(row.id))
  const note = VARIANT_NOTES[variant]

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      if (deletable.every((row) => prev.has(row.id))) {
        return new Set()
      }
      return new Set(deletable.map((row) => row.id))
    })
  }

  return (
    <div style={{ width: 520, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <h3
          style={{
            margin: '0 0 0.25rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--color-slate-900)',
          }}
        >
          {note.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '0.8125rem',
            lineHeight: 1.45,
            color: 'var(--color-slate-500)',
          }}
        >
          {note.summary}
        </p>
      </div>

      <SelectionTableList variant={variant}>
        <SelectionTable>
          <thead>
            <tr>
              <th className={st.colCheck}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="すべて選択"
                />
              </th>
              <th>ブランチ</th>
              <th className={st.colNumeric}>未プッシュ</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ROWS.map((row) => (
              <SelectionTableRow
                key={row.id}
                locked={row.locked}
                focused={focusedId === row.id}
                onClick={() => toggleOne(row.id)}
              >
                <td className={st.colCheck}>
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    disabled={row.locked}
                    onChange={() => toggleOne(row.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`${row.name} を選択`}
                  />
                </td>
                <td>
                  <span className={`${st.mono} ${st.truncate}`}>{row.name}</span>
                </td>
                <td className={st.colNumeric}>{row.ahead}</td>
              </SelectionTableRow>
            ))}
          </tbody>
        </SelectionTable>
      </SelectionTableList>
    </div>
  )
}

/** 採用案: Dense + Soft header（本番デフォルト） */
export const DesignChosen: Story = {
  name: 'Chosen · Dense + Soft header',
  render: () => <VariantDemo variant="current" />,
}

/** 旧現状（比較用） */
export const DesignLegacy: Story = {
  name: 'Reference · Legacy',
  render: () => <VariantDemo variant="legacy" />,
}

/** B: フラット・ミニマル */
export const DesignB_Flat: Story = {
  name: 'Design B · Flat minimal',
  render: () => <VariantDemo variant="flat" />,
}

/** C: ゼブラ行 */
export const DesignC_Zebra: Story = {
  name: 'Design C · Zebra',
  render: () => <VariantDemo variant="zebra" />,
}

/** D: 高密度（採用と同型） */
export const DesignD_Dense: Story = {
  name: 'Design D · Dense',
  render: () => <VariantDemo variant="dense" />,
}

/** E: ソフトな選択ハイライト */
export const DesignE_Soft: Story = {
  name: 'Design E · Soft select',
  render: () => <VariantDemo variant="soft" focusedId="c" />,
}

export const Empty: Story = {
  args: {
    placeholder: '該当する項目はありません',
    variant: 'current',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 520 }}>
        <Story />
      </div>
    ),
  ],
}
