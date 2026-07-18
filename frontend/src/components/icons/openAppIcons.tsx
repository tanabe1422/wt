import type { ReactNode } from 'react'

import type { OpenAppIcon } from '../../types'

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: 16,
        height: 16,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}

export function GenericAppIcon() {
  return (
    <IconFrame>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M5 8.5h6M8 5.5v6"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    </IconFrame>
  )
}

/** Fallback when Windows exe icon extraction is unavailable. */
export function FallbackAppIcon({ icon }: { icon?: OpenAppIcon | string }) {
  void icon
  return <GenericAppIcon />
}

export function openAppIcon(
  icon: OpenAppIcon | string | undefined,
  dataUrl?: string | null,
): ReactNode {
  if (dataUrl) {
    return (
      <IconFrame>
        <img
          src={dataUrl}
          alt=""
          width={16}
          height={16}
          style={{ width: 16, height: 16, objectFit: 'contain', display: 'block' }}
        />
      </IconFrame>
    )
  }
  return <FallbackAppIcon icon={icon} />
}
