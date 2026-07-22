/** サイドバーセクション見出しアイコン（整理アクションと揃える） */
export const SIDEBAR_SECTION_ICON_SIZE = 18

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GitBranchIcon({ size = 14, filled = false }: { size?: number; filled?: boolean }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 9v6M9 6h3.5A4.5 4.5 0 0 1 17 10.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="6" cy="6" r="3" fill="currentColor" />
        <circle cx="6" cy="18" r="3" fill="currentColor" />
        <circle cx="18" cy="10.5" r="3" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="18" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 8.5V16M8.5 6h5a4 4 0 0 1 4 4v0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** ブランチ一覧セクション見出し用（TreeDiagram） */
function BranchSectionIcon({ size = SIDEBAR_SECTION_ICON_SIZE }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 11h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 11v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 11v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="6" cy="17" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="17" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CloudIcon({ size = SIDEBAR_SECTION_ICON_SIZE }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 18h11a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.8A3.5 3.5 0 0 0 7 18z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TagIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.6 13.1 12.9 20.8a2 2 0 0 1-2.8 0L3 13.7V3h10.7l7 7a2 2 0 0 1-.1 3.1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

function BriefcaseIcon({ size = 14, filled = false }: { size?: number; filled?: boolean }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h3.5A1.5 1.5 0 0 1 20 7.5v11A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H9V5zm2 0h2v1h-2V5z"
        />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M5 9h14a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** ワークツリー（セクション見出し・ブランチ行の WT マーク） */
function HardDriveIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 16h16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M4 16 6.5 6.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L20 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="17.5" r="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function WorktreeIcon({ size = SIDEBAR_SECTION_ICON_SIZE }: { size?: number }) {
  return <HardDriveIcon size={size} />
}

function StashIcon({ size = SIDEBAR_SECTION_ICON_SIZE }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export {
  BranchSectionIcon,
  BriefcaseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudIcon,
  FolderIcon,
  GitBranchIcon,
  HardDriveIcon,
  StashIcon,
  TagIcon,
  WorktreeIcon,
}
