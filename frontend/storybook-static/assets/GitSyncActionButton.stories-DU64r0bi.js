import{i as e}from"./preload-helper-CT_b8DTk.js";import{t}from"./jsx-runtime-DqZldVDK.js";import{n,t as r}from"./GitSyncActionButton-DsjVwoE6.js";var i,a,o,s,c,l,u,d,f,p,m,h;e((()=>{n(),i=t(),a={title:`Toolbar/GitSyncActionButton`,component:r,args:{action:`pull`,badgeCount:0},argTypes:{action:{control:`select`,options:[`pull`,`push`,`fetch`]},badgeCount:{control:{type:`number`,min:0}}}},o={args:{action:`pull`}},s={args:{action:`pull`,badgeCount:5}},c={args:{action:`push`}},l={args:{action:`push`,badgeCount:23}},u={args:{action:`fetch`}},d={args:{action:`pull`,disabled:!0}},f={render:()=>(0,i.jsxs)(`div`,{style:{display:`flex`,gap:`0.125rem`,padding:`0.5rem 0.75rem`,background:`var(--color-surface-header)`,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,width:`fit-content`},children:[(0,i.jsx)(r,{action:`pull`,badgeCount:5}),(0,i.jsx)(r,{action:`push`,badgeCount:23}),(0,i.jsx)(r,{action:`fetch`})]})},p={render:()=>(0,i.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1rem`,padding:`1rem`},children:[(0,i.jsxs)(`div`,{children:[(0,i.jsx)(`p`,{style:{margin:`0 0 0.5rem`,fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:`プル待ちのみ`}),(0,i.jsx)(r,{action:`pull`,badgeCount:5})]}),(0,i.jsxs)(`div`,{children:[(0,i.jsx)(`p`,{style:{margin:`0 0 0.5rem`,fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:`プッシュ待ちのみ`}),(0,i.jsx)(r,{action:`push`,badgeCount:23})]}),(0,i.jsxs)(`div`,{children:[(0,i.jsx)(`p`,{style:{margin:`0 0 0.5rem`,fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:`両方あり`}),(0,i.jsxs)(`div`,{style:{display:`flex`,gap:`0.125rem`},children:[(0,i.jsx)(r,{action:`pull`,badgeCount:3}),(0,i.jsx)(r,{action:`push`,badgeCount:12})]})]}),(0,i.jsxs)(`div`,{children:[(0,i.jsx)(`p`,{style:{margin:`0 0 0.5rem`,fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:`大きい件数`}),(0,i.jsxs)(`div`,{style:{display:`flex`,gap:`0.125rem`},children:[(0,i.jsx)(r,{action:`pull`,badgeCount:99}),(0,i.jsx)(r,{action:`push`,badgeCount:150})]})]})]})},m={render:()=>(0,i.jsxs)(`div`,{style:{width:480,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,overflow:`hidden`,background:`var(--color-surface-main)`},children:[(0,i.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.125rem`,minHeight:`3rem`,padding:`0.5rem 0.75rem`,background:`var(--color-surface-header)`,borderBottom:`1px solid var(--color-slate-200)`},children:[(0,i.jsx)(r,{action:`pull`,badgeCount:5}),(0,i.jsx)(r,{action:`push`,badgeCount:23}),(0,i.jsx)(r,{action:`fetch`})]}),(0,i.jsx)(`div`,{style:{padding:`1rem`,fontSize:`0.8125rem`,color:`var(--color-slate-500)`},children:`メインコンテンツ領域`})]})},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'pull'
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'pull',
    badgeCount: 5
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'push'
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'push',
    badgeCount: 23
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'fetch'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    action: 'pull',
    disabled: true
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '0.125rem',
    padding: '0.5rem 0.75rem',
    background: 'var(--color-surface-header)',
    border: '1px solid var(--color-slate-200)',
    borderRadius: '0.375rem',
    width: 'fit-content'
  }}>\r
      <GitSyncActionButton action="pull" badgeCount={5} />\r
      <GitSyncActionButton action="push" badgeCount={23} />\r
      <GitSyncActionButton action="fetch" />\r
    </div>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem'
  }}>\r
      <div>\r
        <p style={{
        margin: '0 0 0.5rem',
        fontSize: '0.75rem',
        color: 'var(--color-slate-500)'
      }}>\r
          プル待ちのみ\r
        </p>\r
        <GitSyncActionButton action="pull" badgeCount={5} />\r
      </div>\r
      <div>\r
        <p style={{
        margin: '0 0 0.5rem',
        fontSize: '0.75rem',
        color: 'var(--color-slate-500)'
      }}>\r
          プッシュ待ちのみ\r
        </p>\r
        <GitSyncActionButton action="push" badgeCount={23} />\r
      </div>\r
      <div>\r
        <p style={{
        margin: '0 0 0.5rem',
        fontSize: '0.75rem',
        color: 'var(--color-slate-500)'
      }}>\r
          両方あり\r
        </p>\r
        <div style={{
        display: 'flex',
        gap: '0.125rem'
      }}>\r
          <GitSyncActionButton action="pull" badgeCount={3} />\r
          <GitSyncActionButton action="push" badgeCount={12} />\r
        </div>\r
      </div>\r
      <div>\r
        <p style={{
        margin: '0 0 0.5rem',
        fontSize: '0.75rem',
        color: 'var(--color-slate-500)'
      }}>\r
          大きい件数\r
        </p>\r
        <div style={{
        display: 'flex',
        gap: '0.125rem'
      }}>\r
          <GitSyncActionButton action="pull" badgeCount={99} />\r
          <GitSyncActionButton action="push" badgeCount={150} />\r
        </div>\r
      </div>\r
    </div>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: 480,
    border: '1px solid var(--color-slate-200)',
    borderRadius: '0.375rem',
    overflow: 'hidden',
    background: 'var(--color-surface-main)'
  }}>\r
      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.125rem',
      minHeight: '3rem',
      padding: '0.5rem 0.75rem',
      background: 'var(--color-surface-header)',
      borderBottom: '1px solid var(--color-slate-200)'
    }}>\r
        <GitSyncActionButton action="pull" badgeCount={5} />\r
        <GitSyncActionButton action="push" badgeCount={23} />\r
        <GitSyncActionButton action="fetch" />\r
      </div>\r
      <div style={{
      padding: '1rem',
      fontSize: '0.8125rem',
      color: 'var(--color-slate-500)'
    }}>\r
        メインコンテンツ領域\r
      </div>\r
    </div>
}`,...m.parameters?.docs?.source}}},h=[`Pull`,`PullWithBadge`,`Push`,`PushWithBadge`,`Fetch`,`Disabled`,`AllActions`,`BadgePatterns`,`InToolbarContext`]}))();export{f as AllActions,p as BadgePatterns,d as Disabled,u as Fetch,m as InToolbarContext,o as Pull,s as PullWithBadge,c as Push,l as PushWithBadge,h as __namedExportsOrder,a as default};