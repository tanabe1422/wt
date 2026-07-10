import{i as e,s as t}from"./preload-helper-CT_b8DTk.js";import{C as n}from"./iframe-9Sacgtqn.js";import{t as r}from"./jsx-runtime-DqZldVDK.js";import{n as i,t as a}from"./cx-BjA3phlr.js";import{n as o,t as s}from"./Button-CKEiMdR5.js";var c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O=e((()=>{c=`_panel_16tff_1`,l=`_header_16tff_19`,u=`_fileName_16tff_39`,d=`_content_16tff_59`,f=`_placeholder_16tff_73`,p=`_error_16tff_75`,m=`_hunk_16tff_97`,h=`_hunkHeader_16tff_105`,g=`_hunkRange_16tff_131`,_=`_hunkActions_16tff_145`,v=`_hunkAction_16tff_145`,y=`_hunkActionDanger_16tff_191`,b=`_lines_16tff_209`,x=`_line_16tff_209`,S=`_lineNo_16tff_235`,C=`_prefix_16tff_249`,w=`_text_16tff_259`,T=`_add_16tff_271`,E=`_del_16tff_279`,D={panel:c,header:l,fileName:u,content:d,placeholder:f,error:p,hunk:m,hunkHeader:h,hunkRange:g,hunkActions:_,hunkAction:v,hunkActionDanger:y,lines:b,line:x,lineNo:S,prefix:C,text:w,add:T,del:E}}));function k({diff:e,loading:t,error:n,file:r,staged:i=!1,conflict:o=!1,busy:c=!1,onStageHunk:l,onUnstageHunk:u,onDiscardHunk:d}){return r?(0,A.jsxs)(`div`,{className:D.panel,children:[(0,A.jsx)(`header`,{className:D.header,children:(0,A.jsx)(`h2`,{className:D.fileName,children:r})}),(0,A.jsx)(`div`,{className:D.content,children:t?(0,A.jsx)(`p`,{className:D.placeholder,children:`読み込み中…`}):n?(0,A.jsx)(`p`,{className:D.placeholder,children:`差分を表示できません`}):!e||e.hunks.length===0?(0,A.jsx)(`p`,{className:D.placeholder,children:o?`競合中のファイルです。右クリックから「外部ツールで競合を解決」を選んでください。`:`差分がありません`}):e.hunks.map((e,t)=>(0,A.jsxs)(`section`,{className:D.hunk,children:[(0,A.jsxs)(`div`,{className:D.hunkHeader,children:[(0,A.jsx)(`span`,{className:D.hunkRange,children:e.header}),(0,A.jsxs)(`div`,{className:D.hunkActions,children:[!o&&!i&&l&&(0,A.jsx)(s,{type:`button`,className:D.hunkAction,disabled:c,onClick:()=>l(t),children:`Hunkをステージに移動`}),!o&&i&&u&&(0,A.jsx)(s,{type:`button`,className:D.hunkAction,disabled:c,onClick:()=>u(t),children:`Hunkをアンステージに移動`}),!o&&d&&(0,A.jsx)(s,{type:`button`,className:a(D.hunkAction,D.hunkActionDanger),disabled:c,onClick:()=>d(t),children:`Hunkを破棄`})]})]}),(0,A.jsx)(`pre`,{className:D.lines,children:e.lines.map((e,n)=>(0,A.jsxs)(`div`,{className:a(D.line,e.kind===`add`&&D.add,e.kind===`del`&&D.del),children:[(0,A.jsx)(`span`,{className:D.lineNo,children:e.oldNo?String(e.oldNo):``}),(0,A.jsx)(`span`,{className:D.lineNo,children:e.newNo?String(e.newNo):``}),(0,A.jsx)(`span`,{className:D.prefix,children:e.kind===`add`?`+`:e.kind===`del`?`-`:` `}),(0,A.jsx)(`span`,{className:D.text,children:e.content})]},`${t}-${n}`))})]},`${e.header}-${t}`))})]}):(0,A.jsx)(`div`,{className:D.panel,children:(0,A.jsx)(`p`,{className:D.placeholder,children:`ファイルを選択すると diff が表示されます`})})}var A,j=e((()=>{o(),i(),O(),A=r(),k.__docgenInfo={description:``,methods:[],displayName:`DiffView`,props:{diff:{required:!0,tsType:{name:`union`,raw:`FileDiff | null`,elements:[{name:`FileDiff`},{name:`null`}]},description:``},loading:{required:!0,tsType:{name:`boolean`},description:``},error:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``},file:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``},staged:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},conflict:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},busy:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},onStageHunk:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(hunkIndex: number) => void`,signature:{arguments:[{type:{name:`number`},name:`hunkIndex`}],return:{name:`void`}}},description:``},onUnstageHunk:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(hunkIndex: number) => void`,signature:{arguments:[{type:{name:`number`},name:`hunkIndex`}],return:{name:`void`}}},description:``},onDiscardHunk:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(hunkIndex: number) => void`,signature:{arguments:[{type:{name:`number`},name:`hunkIndex`}],return:{name:`void`}}},description:``}}}})),M,N,P,ee=e((()=>{M=`src/components/App.tsx`,N={path:M,hunks:[{header:`@@ -12,8 +12,9 @@ export function App() {`,lines:[{kind:`ctx`,content:`export function App() {`,oldNo:12,newNo:12},{kind:`ctx`,content:`  const [count, setCount] = useState(0)`,oldNo:13,newNo:13},{kind:`del`,content:`  const title = "wt-manager"`,oldNo:14,newNo:void 0},{kind:`add`,content:`  const title = "wt-manager"`,oldNo:void 0,newNo:14},{kind:`add`,content:`  const version = "1.0.0"`,oldNo:void 0,newNo:15},{kind:`ctx`,content:``,oldNo:15,newNo:16},{kind:`ctx`,content:`  return (`,oldNo:16,newNo:17},{kind:`ctx`,content:`    <main>`,oldNo:17,newNo:18},{kind:`ctx`,content:`      <h1>{title}</h1>`,oldNo:18,newNo:19}]},{header:`@@ -24,4 +25,5 @@ export function App() {`,lines:[{kind:`ctx`,content:`      <button onClick={() => setCount((c) => c + 1)}>`,oldNo:24,newNo:25},{kind:`ctx`,content:`        count: {count}`,oldNo:25,newNo:26},{kind:`del`,content:`      </button>`,oldNo:26,newNo:void 0},{kind:`add`,content:`      </button>`,oldNo:void 0,newNo:27},{kind:`add`,content:`      <p>v{version}</p>`,oldNo:void 0,newNo:28},{kind:`ctx`,content:`    </main>`,oldNo:27,newNo:29}]}]},P={path:`README.md`,hunks:[{header:`@@ -1,3 +1,4 @@`,lines:[{kind:`ctx`,content:`# Sample`,oldNo:1,newNo:1},{kind:`ctx`,content:`context line`,oldNo:2,newNo:2},{kind:`del`,content:`removed`,oldNo:3,newNo:void 0},{kind:`add`,content:`added`,oldNo:void 0,newNo:3},{kind:`ctx`,content:`context2`,oldNo:4,newNo:4}]}]}}));function F(e){let[t,n]=(0,L.useState)([]),r=e=>n(t=>[...t,e]);return(0,R.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`0.75rem`,height:`100%`},children:[(0,R.jsx)(`div`,{style:{flex:1,minHeight:0},children:(0,R.jsx)(k,{...e,onStageHunk:e=>r(`stage hunk ${e}`),onUnstageHunk:e=>r(`unstage hunk ${e}`),onDiscardHunk:e=>r(`discard hunk ${e}`)})}),t.length>0&&(0,R.jsx)(`div`,{style:{flexShrink:0,padding:`0.5rem 0.75rem`,fontSize:`0.75rem`,fontFamily:`ui-monospace, monospace`,color:`var(--color-slate-600)`,background:`var(--color-slate-50)`,borderTop:`1px solid var(--color-slate-200)`},children:t.map((e,t)=>(0,R.jsx)(`div`,{children:e},`${e}-${t}`))})]})}function I({children:e}){return(0,R.jsxs)(`div`,{style:{display:`flex`,width:900,height:480,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,overflow:`hidden`,background:`var(--color-surface-main)`},children:[(0,R.jsx)(`div`,{style:{flex:`0 0 38%`,minWidth:0,borderRight:`1px solid var(--color-slate-200)`,padding:`0.75rem`,fontSize:`0.8125rem`,color:`var(--color-slate-500)`},children:`変更ファイル一覧 / コミット情報`}),(0,R.jsx)(`div`,{style:{flex:1,minWidth:0,minHeight:0},children:e})]})}var L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q,$;e((()=>{L=t(n(),1),j(),ee(),R=r(),z=(e=560,t=420)=>function(n){return(0,R.jsx)(`div`,{style:{width:e,height:t,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,overflow:`hidden`,background:`var(--color-surface-main)`},children:(0,R.jsx)(n,{})})},B={title:`Git/DiffView`,component:k,decorators:[z()],args:{diff:null,loading:!1,error:null,file:null,staged:!1,conflict:!1,busy:!1},argTypes:{onStageHunk:{table:{disable:!0}},onUnstageHunk:{table:{disable:!0}},onDiscardHunk:{table:{disable:!0}}}},V={},H={args:{file:M,loading:!0}},U={args:{file:M,error:`バイナリファイルの差分は表示できません`}},W={args:{file:M,diff:{path:M,hunks:[]}}},G={args:{file:`src/conflict.ts`,conflict:!0,diff:{path:`src/conflict.ts`,hunks:[]}}},K={args:{file:P.path,diff:P}},q={args:{file:N.path,diff:N}},J={decorators:[z(640,480)],render:e=>(0,R.jsx)(F,{...e,file:N.path,diff:N,staged:!1})},Y={decorators:[z(640,480)],render:e=>(0,R.jsx)(F,{...e,file:N.path,diff:N,staged:!0})},X={args:{file:N.path,diff:N,busy:!0,onStageHunk:()=>void 0,onDiscardHunk:()=>void 0}},Z={decorators:[e=>(0,R.jsx)(I,{children:(0,R.jsx)(e,{})})],args:{file:N.path,diff:N,onStageHunk:()=>void 0,onDiscardHunk:()=>void 0}},Q={decorators:[e=>(0,R.jsx)(I,{children:(0,R.jsx)(e,{})})],args:{file:P.path,diff:P}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  args: {
    file: SAMPLE_FILE_PATH,
    loading: true
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  args: {
    file: SAMPLE_FILE_PATH,
    error: 'バイナリファイルの差分は表示できません'
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  args: {
    file: SAMPLE_FILE_PATH,
    diff: {
      path: SAMPLE_FILE_PATH,
      hunks: []
    }
  }
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  args: {
    file: 'src/conflict.ts',
    conflict: true,
    diff: {
      path: 'src/conflict.ts',
      hunks: []
    }
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  args: {
    file: readmeFileDiff.path,
    diff: readmeFileDiff
  }
}`,...K.parameters?.docs?.source},description:{story:`履歴ビュー（CommitDetailPane）と同様の読み取り専用表示`,...K.parameters?.docs?.description}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  args: {
    file: sampleFileDiff.path,
    diff: sampleFileDiff
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  decorators: [panelDecorator(640, 480)],
  render: args => <UnstagedWithActions {...args} file={sampleFileDiff.path} diff={sampleFileDiff} staged={false} />
}`,...J.parameters?.docs?.source},description:{story:`ファイルビュー（GitWorkspace）の未ステージ変更`,...J.parameters?.docs?.description}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  decorators: [panelDecorator(640, 480)],
  render: args => <UnstagedWithActions {...args} file={sampleFileDiff.path} diff={sampleFileDiff} staged />
}`,...Y.parameters?.docs?.source},description:{story:`ファイルビュー（GitWorkspace）のステージ済み変更`,...Y.parameters?.docs?.description}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  args: {
    file: sampleFileDiff.path,
    diff: sampleFileDiff,
    busy: true,
    onStageHunk: () => undefined,
    onDiscardHunk: () => undefined
  }
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <WorkspaceLayout><Story /></WorkspaceLayout>],
  args: {
    file: sampleFileDiff.path,
    diff: sampleFileDiff,
    onStageHunk: () => undefined,
    onDiscardHunk: () => undefined
  }
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <WorkspaceLayout><Story /></WorkspaceLayout>],
  args: {
    file: readmeFileDiff.path,
    diff: readmeFileDiff
  }
}`,...Q.parameters?.docs?.source}}},$=[`NoFileSelected`,`Loading`,`Error`,`NoDiff`,`Conflict`,`HistoryReadOnly`,`WithDiff`,`UnstagedWithHunkActions`,`StagedWithHunkActions`,`Busy`,`InFilesWorkspace`,`InHistoryPane`]}))();export{X as Busy,G as Conflict,U as Error,K as HistoryReadOnly,Z as InFilesWorkspace,Q as InHistoryPane,H as Loading,W as NoDiff,V as NoFileSelected,Y as StagedWithHunkActions,J as UnstagedWithHunkActions,q as WithDiff,$ as __namedExportsOrder,B as default};