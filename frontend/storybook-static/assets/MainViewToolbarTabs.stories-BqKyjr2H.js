import{i as e,s as t}from"./preload-helper-CT_b8DTk.js";import{C as n}from"./iframe-9Sacgtqn.js";import{t as r}from"./jsx-runtime-DqZldVDK.js";import{n as i,t as a}from"./MainViewToolbarTabs-BD5UN0f0.js";var o,s,c,l,u,d,f;e((()=>{o=t(n(),1),i(),s=r(),c={title:`Toolbar/MainViewToolbarTabs`,component:a,render:e=>{let[t,n]=(0,o.useState)(e.view);return(0,s.jsx)(a,{view:t,onChange:n})},args:{view:`files`,onChange:()=>{}},argTypes:{onChange:{table:{disable:!0}}},decorators:[e=>(0,s.jsx)(`div`,{style:{display:`inline-flex`,padding:`0.5rem 0.75rem`,background:`var(--color-surface-header)`,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`},children:(0,s.jsx)(e,{})})]},l={args:{view:`files`}},u={args:{view:`history`}},d={render:e=>{let[t,n]=(0,o.useState)(e.view);return(0,s.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.75rem`},children:[(0,s.jsx)(a,{view:t,onChange:n}),(0,s.jsx)(`div`,{"aria-hidden":!0,style:{width:1,height:`1.75rem`,background:`var(--color-slate-300)`}}),(0,s.jsx)(`span`,{style:{fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:`Pull / Push / Fetch …`})]})}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    view: 'files'
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    view: 'history'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: args => {
    const [view, setView] = useState<MainView>(args.view);
    return <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    }}>\r
        <MainViewToolbarTabs view={view} onChange={setView} />\r
        <div aria-hidden style={{
        width: 1,
        height: '1.75rem',
        background: 'var(--color-slate-300)'
      }} />\r
        <span style={{
        fontSize: '0.75rem',
        color: 'var(--color-slate-500)'
      }}>Pull / Push / Fetch …</span>\r
      </div>;
  }
}`,...d.parameters?.docs?.source}}},f=[`Files`,`History`,`WithDividerPreview`]}))();export{l as Files,u as History,d as WithDividerPreview,f as __namedExportsOrder,c as default};