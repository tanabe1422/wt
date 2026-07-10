import{i as e}from"./preload-helper-CT_b8DTk.js";import{t}from"./jsx-runtime-DqZldVDK.js";import{a as n,i as r,n as i,r as a,t as o}from"./GitSyncActionButton-DsjVwoE6.js";function s({action:e,description:t}){return(0,c.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,alignItems:`center`,gap:`0.5rem`,padding:`0.75rem 1rem`,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,background:`var(--color-white)`,minWidth:`7rem`},children:[(0,c.jsx)(a,{action:e,size:24}),(0,c.jsxs)(`div`,{style:{textAlign:`center`},children:[(0,c.jsx)(`div`,{style:{fontSize:`0.8125rem`,fontWeight:600,color:`var(--color-slate-700)`},children:r(e)}),(0,c.jsx)(`div`,{style:{fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:t})]})]})}var c,l,u,d,f,p,m,h,g;e((()=>{i(),n(),c=t(),l=[`pull`,`push`,`fetch`],u={title:`Toolbar/GitSyncIcons`,component:a,args:{action:`pull`},argTypes:{action:{control:`select`,options:l}}},d={args:{action:`pull`}},f={args:{action:`push`}},p={args:{action:`fetch`}},m={render:()=>(0,c.jsxs)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:`1rem`,padding:`1rem`},children:[(0,c.jsx)(s,{action:`pull`,description:`下矢印 — リモートから取り込む`}),(0,c.jsx)(s,{action:`push`,description:`上矢印 — リモートへ送る`}),(0,c.jsx)(s,{action:`fetch`,description:`回転矢印 — リモート情報を更新`})]})},h={render:()=>(0,c.jsx)(`div`,{style:{display:`flex`,gap:`0.125rem`,padding:`0.5rem`,background:`var(--color-surface-header)`,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,width:`fit-content`},children:l.map(e=>(0,c.jsx)(o,{action:e},e))})},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'pull'
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'push'
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'fetch'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    padding: '1rem'
  }}>\r
      <IconCell action="pull" description="下矢印 — リモートから取り込む" />\r
      <IconCell action="push" description="上矢印 — リモートへ送る" />\r
      <IconCell action="fetch" description="回転矢印 — リモート情報を更新" />\r
    </div>
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '0.125rem',
    padding: '0.5rem',
    background: 'var(--color-surface-header)',
    border: '1px solid var(--color-slate-200)',
    borderRadius: '0.375rem',
    width: 'fit-content'
  }}>\r
      {ACTIONS.map(action => <GitSyncActionButton key={action} action={action} />)}\r
    </div>
}`,...h.parameters?.docs?.source}}},g=[`Pull`,`Push`,`Fetch`,`AllIcons`,`AsButtons`]}))();export{m as AllIcons,h as AsButtons,p as Fetch,d as Pull,f as Push,g as __namedExportsOrder,u as default};