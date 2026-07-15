import type { FileDiff } from '../../types'

export const SAMPLE_FILE_PATH = 'src/components/App.tsx'

export const sampleFileDiff: FileDiff = {
  path: SAMPLE_FILE_PATH,
  hunks: [
    {
      header: '@@ -12,8 +12,9 @@ export function App() {',
      lines: [
        { kind: 'ctx', content: 'export function App() {', oldNo: 12, newNo: 12 },
        { kind: 'ctx', content: '  const [count, setCount] = useState(0)', oldNo: 13, newNo: 13 },
        { kind: 'del', content: '  const title = "wt-manager"', oldNo: 14, newNo: undefined },
        { kind: 'add', content: '  const title = "wt-manager"', oldNo: undefined, newNo: 14 },
        { kind: 'add', content: '  const version = "1.0.0"', oldNo: undefined, newNo: 15 },
        { kind: 'ctx', content: '', oldNo: 15, newNo: 16 },
        { kind: 'ctx', content: '  return (', oldNo: 16, newNo: 17 },
        { kind: 'ctx', content: '    <main>', oldNo: 17, newNo: 18 },
        { kind: 'ctx', content: '      <h1>{title}</h1>', oldNo: 18, newNo: 19 },
      ],
    },
    {
      header: '@@ -24,4 +25,5 @@ export function App() {',
      lines: [
        { kind: 'ctx', content: '      <button onClick={() => setCount((c) => c + 1)}>', oldNo: 24, newNo: 25 },
        { kind: 'ctx', content: '        count: {count}', oldNo: 25, newNo: 26 },
        { kind: 'del', content: '      </button>', oldNo: 26, newNo: undefined },
        { kind: 'add', content: '      </button>', oldNo: undefined, newNo: 27 },
        { kind: 'add', content: '      <p>v{version}</p>', oldNo: undefined, newNo: 28 },
        { kind: 'ctx', content: '    </main>', oldNo: 27, newNo: 29 },
      ],
    },
  ],
}

/** 半角スペース可視化確認用（インデント・末尾スペース・連続スペース） */
export const whitespaceFileDiff: FileDiff = {
  path: 'src/whitespace.ts',
  hunks: [
    {
      header: '@@ -1,4 +1,5 @@',
      lines: [
        { kind: 'ctx', content: 'export function pad(value: string) {', oldNo: 1, newNo: 1 },
        { kind: 'del', content: '  return value', oldNo: 2, newNo: undefined },
        { kind: 'add', content: '  return  value  ', oldNo: undefined, newNo: 2 },
        { kind: 'add', content: '    // trailing spaces →  ', oldNo: undefined, newNo: 3 },
        { kind: 'ctx', content: '}', oldNo: 3, newNo: 4 },
      ],
    },
  ],
}

export const readmeFileDiff: FileDiff = {
  path: 'README.md',
  hunks: [
    {
      header: '@@ -1,3 +1,4 @@',
      lines: [
        { kind: 'ctx', content: '# Sample', oldNo: 1, newNo: 1 },
        { kind: 'ctx', content: 'context line', oldNo: 2, newNo: 2 },
        { kind: 'del', content: 'removed', oldNo: 3, newNo: undefined },
        { kind: 'add', content: 'added', oldNo: undefined, newNo: 3 },
        { kind: 'ctx', content: 'context2', oldNo: 4, newNo: 4 },
      ],
    },
  ],
}
