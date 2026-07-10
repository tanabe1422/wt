import{i as e,s as t}from"./preload-helper-CT_b8DTk.js";import{C as n}from"./iframe-9Sacgtqn.js";import{t as r}from"./jsx-runtime-DqZldVDK.js";import{a as i,i as a,n as o,t as s}from"./wails-Bu0n2jMf.js";import{a as c,n as l,t as u}from"./GitSyncActionButton-DsjVwoE6.js";import{n as d,t as f}from"./ErrorDialog-DS5B-OEW.js";import{n as p,t as m}from"./MainViewToolbarTabs-BD5UN0f0.js";function h(e){let[t,n]=(0,g.useState)(!1);return(0,g.useEffect)(()=>{n(!1)},[e]),{open:e!==null&&!t,message:e??``,dismiss:()=>n(!0)}}var g,_=e((()=>{g=t(n(),1)})),v,y,b,x,S,C=e((()=>{v=`_bar_9r05t_1`,y=`_leading_9r05t_21`,b=`_divider_9r05t_35`,x=`_toolGroup_9r05t_49`,S={bar:v,leading:y,divider:b,toolGroup:x}}));async function w(e,t){if(e===`fetch`){await s(t);return}if(e===`pull`){await a(t);return}await i(t)}function T({worktreePath:e,disabled:t=!1,aheadCount:n=0,behindCount:r=0,mainView:i,onMainViewChange:a,onActionComplete:o}){let[s,c]=(0,E.useState)(null),[l,d]=(0,E.useState)(`操作に失敗しました`),[p,g]=(0,E.useState)(!1),_=h(s),v=async t=>{c(null),g(!0);try{await w(t,e)}catch(e){d(k[t]),c(e instanceof Error?e.message:`操作に失敗しました`)}finally{await o?.(),g(!1)}},y=t||p||!e;return(0,D.jsxs)(`header`,{className:S.bar,children:[(0,D.jsxs)(`div`,{className:S.leading,children:[(0,D.jsx)(m,{view:i,onChange:a}),(0,D.jsx)(`div`,{className:S.divider,"aria-hidden":`true`}),(0,D.jsx)(`div`,{className:S.toolGroup,children:O.map(e=>(0,D.jsx)(u,{action:e,badgeCount:e===`pull`?r:e===`push`?n:0,disabled:y,onClick:()=>void v(e)},e))})]}),(0,D.jsx)(f,{open:_.open,title:l,message:_.message,onClose:_.dismiss})]})}var E,D,O,k,A=e((()=>{E=t(n(),1),_(),o(),d(),l(),c(),p(),C(),D=r(),O=[`pull`,`push`,`fetch`],k={fetch:`フェッチに失敗しました`,pull:`プルに失敗しました`,push:`プッシュに失敗しました`},T.__docgenInfo={description:``,methods:[],displayName:`GitSyncToolbar`,props:{worktreePath:{required:!0,tsType:{name:`string`},description:``},disabled:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}},aheadCount:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`0`,computed:!1}},behindCount:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`0`,computed:!1}},mainView:{required:!0,tsType:{name:`union`,raw:`'files' | 'history'`,elements:[{name:`literal`,value:`'files'`},{name:`literal`,value:`'history'`}]},description:``},onMainViewChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(view: MainView) => void`,signature:{arguments:[{type:{name:`union`,raw:`'files' | 'history'`,elements:[{name:`literal`,value:`'files'`},{name:`literal`,value:`'history'`}]},name:`view`}],return:{name:`void`}}},description:``},onActionComplete:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void | Promise<void>`,signature:{arguments:[],return:{name:`union`,raw:`void | Promise<void>`,elements:[{name:`void`},{name:`Promise`,elements:[{name:`void`}],raw:`Promise<void>`}]}}},description:``}}}}));function j(e){let{initialView:t=`files`,...n}=e,[r,i]=(0,M.useState)(t);return(0,N.jsx)(T,{...n,mainView:r,onMainViewChange:i})}var M,N,P,F,I,L,R,z,B,V,H,U,W;e((()=>{M=t(n(),1),A(),N=r(),P={title:`Toolbar/GitSyncToolbar`,component:T,render:e=>(0,N.jsx)(j,{...e}),args:{worktreePath:`C:/dev/sample-repo`,aheadCount:0,behindCount:0,mainView:`files`,onMainViewChange:()=>{}},argTypes:{aheadCount:{control:{type:`number`,min:0}},behindCount:{control:{type:`number`,min:0}},mainView:{control:`select`,options:[`files`,`history`]},onMainViewChange:{table:{disable:!0}}},decorators:[e=>(0,N.jsxs)(`div`,{style:{width:720,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,overflow:`hidden`,background:`var(--color-surface-main)`},children:[(0,N.jsx)(e,{}),(0,N.jsx)(`div`,{style:{padding:`1rem`,fontSize:`0.8125rem`,color:`var(--color-slate-500)`},children:`メインコンテンツ領域（モック API で Fetch / Pull / Push が動作します）`})]})]},F={},I={render:e=>(0,N.jsx)(j,{...e,initialView:`history`})},L={args:{aheadCount:23,behindCount:5}},R={args:{aheadCount:12,behindCount:0}},z={args:{aheadCount:0,behindCount:8}},B={args:{aheadCount:99,behindCount:150}},V={args:{disabled:!0}},H={args:{worktreePath:``}},U={decorators:[e=>(0,N.jsx)(`div`,{style:{width:`100%`,minWidth:720},children:(0,N.jsxs)(`div`,{style:{border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,overflow:`hidden`,background:`var(--color-surface-main)`},children:[(0,N.jsx)(`div`,{style:{padding:`0.5rem 0.75rem`,fontSize:`0.75rem`,fontWeight:600,color:`var(--color-slate-500)`,background:`var(--color-slate-200)`,borderBottom:`1px solid var(--color-slate-200)`},children:`RepoTabBar（参考）`}),(0,N.jsx)(e,{}),(0,N.jsxs)(`div`,{style:{display:`flex`,minHeight:200},children:[(0,N.jsx)(`div`,{style:{width:220,padding:`0.75rem`,fontSize:`0.75rem`,color:`var(--color-slate-500)`,borderRight:`1px solid var(--color-slate-200)`,background:`var(--color-surface-main)`},children:`サイドバー`}),(0,N.jsx)(`div`,{style:{flex:1,padding:`0.75rem`,fontSize:`0.8125rem`,color:`var(--color-slate-500)`},children:`メインコンテンツ`})]})]})})]},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: args => <InteractiveToolbar {...args} initialView="history" />
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  args: {
    aheadCount: 23,
    behindCount: 5
  }
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  args: {
    aheadCount: 12,
    behindCount: 0
  }
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  args: {
    aheadCount: 0,
    behindCount: 8
  }
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  args: {
    aheadCount: 99,
    behindCount: 150
  }
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  args: {
    worktreePath: ''
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <div style={{
    width: '100%',
    minWidth: 720
  }}>\r
        <div style={{
      border: '1px solid var(--color-slate-200)',
      borderRadius: '0.375rem',
      overflow: 'hidden',
      background: 'var(--color-surface-main)'
    }}>\r
          <div style={{
        padding: '0.5rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--color-slate-500)',
        background: 'var(--color-slate-200)',
        borderBottom: '1px solid var(--color-slate-200)'
      }}>\r
            RepoTabBar（参考）\r
          </div>\r
          <Story />\r
          <div style={{
        display: 'flex',
        minHeight: 200
      }}>\r
            <div style={{
          width: 220,
          padding: '0.75rem',
          fontSize: '0.75rem',
          color: 'var(--color-slate-500)',
          borderRight: '1px solid var(--color-slate-200)',
          background: 'var(--color-surface-main)'
        }}>\r
              サイドバー\r
            </div>\r
            <div style={{
          flex: 1,
          padding: '0.75rem',
          fontSize: '0.8125rem',
          color: 'var(--color-slate-500)'
        }}>\r
              メインコンテンツ\r
            </div>\r
          </div>\r
        </div>\r
      </div>]
}`,...U.parameters?.docs?.source}}},W=[`Default`,`HistoryView`,`WithCounts`,`AheadOnly`,`BehindOnly`,`LargeCounts`,`Disabled`,`NoWorktree`,`FullWidth`]}))();export{R as AheadOnly,z as BehindOnly,F as Default,V as Disabled,U as FullWidth,I as HistoryView,B as LargeCounts,H as NoWorktree,L as WithCounts,W as __namedExportsOrder,P as default};