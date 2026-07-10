import{i as e}from"./preload-helper-CT_b8DTk.js";import{t}from"./jsx-runtime-DqZldVDK.js";import{a as n,i as r,n as i,o as a,r as o,s,t as c}from"./GitIcons-CZTrhTIn.js";function l({title:e,children:t}){return(0,d.jsxs)(`section`,{style:{display:`flex`,flexDirection:`column`,gap:`0.75rem`},children:[(0,d.jsx)(`h3`,{style:{margin:0,fontSize:`0.875rem`,fontWeight:600,color:`var(--color-slate-700)`},children:e}),(0,d.jsx)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fill, minmax(7rem, 1fr))`,gap:`0.75rem`},children:t})]})}function u({label:e,sublabel:t,children:n}){return(0,d.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,alignItems:`center`,gap:`0.5rem`,padding:`0.75rem`,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,background:`var(--color-white)`},children:[n,(0,d.jsxs)(`div`,{style:{textAlign:`center`},children:[(0,d.jsx)(`div`,{style:{fontSize:`0.8125rem`,fontWeight:600,color:`var(--color-slate-700)`},children:e}),t&&(0,d.jsx)(`div`,{style:{fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:t})]})]})}var d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E;e((()=>{a(),d=t(),f={title:`Git/GitIcons`,component:i,args:{type:`modified`}},p=[`staged`,`changes`],m=[`modified`,`added`,`deleted`,`renamed`,`untracked`,`conflict`],h=[`M`,`A`,`D`,`R`,`?`,`U`,` `],g={render:()=>(0,d.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1.5rem`,padding:`1rem`},children:[(0,d.jsx)(l,{title:`エリア（ステージ / 変更）`,children:p.map(e=>(0,d.jsx)(u,{label:r(e),sublabel:e,children:(0,d.jsx)(c,{area:e})},e))}),(0,d.jsx)(l,{title:`変更種別（変更・リネームは同色、形状で区別）`,children:m.map(e=>(0,d.jsx)(u,{label:n(e),sublabel:e,children:(0,d.jsx)(i,{type:e})},e))}),(0,d.jsx)(l,{title:`Porcelain コード対応`,children:h.map(e=>{let t=s(e);return(0,d.jsx)(u,{label:e===` `?`(空白)`:e,sublabel:t?n(t):`表示なし`,children:t?(0,d.jsx)(o,{code:e}):(0,d.jsx)(`span`,{style:{width:20,height:20}})},e)})})]})},_={args:{type:`modified`}},v={args:{type:`added`}},y={args:{type:`deleted`}},b={args:{type:`renamed`}},x={args:{type:`untracked`}},S={args:{type:`conflict`}},C={render:()=>(0,d.jsx)(c,{area:`staged`})},w={render:()=>(0,d.jsx)(c,{area:`changes`})},T={render:()=>(0,d.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1px`,width:320,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,overflow:`hidden`,background:`var(--color-surface-main)`},children:[(0,d.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.5rem`,padding:`0.5rem 0.75rem`,background:`var(--color-surface-header)`,borderBottom:`1px solid var(--color-slate-200)`,fontSize:`0.8125rem`,fontWeight:600,color:`var(--color-slate-700)`},children:[(0,d.jsx)(c,{area:`staged`}),`ステージ済み`]}),[{type:`modified`,path:`src/app.tsx`},{type:`added`,path:`src/new-file.ts`}].map(e=>(0,d.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.5rem`,padding:`0.375rem 0.75rem`,borderBottom:`1px solid var(--color-slate-200)`},children:[(0,d.jsx)(i,{type:e.type}),(0,d.jsx)(`span`,{style:{fontSize:`0.875rem`},children:e.path})]},e.path)),(0,d.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.5rem`,padding:`0.5rem 0.75rem`,background:`var(--color-surface-header)`,borderBottom:`1px solid var(--color-slate-200)`,fontSize:`0.8125rem`,fontWeight:600,color:`var(--color-slate-700)`},children:[(0,d.jsx)(c,{area:`changes`}),`変更`]}),[{type:`deleted`,path:`old/util.ts`},{type:`renamed`,path:`src/renamed.ts`},{type:`untracked`,path:`notes.md`},{type:`conflict`,path:`src/conflict.ts`}].map(e=>(0,d.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.5rem`,padding:`0.375rem 0.75rem`,borderBottom:`1px solid var(--color-slate-200)`},children:[(0,d.jsx)(i,{type:e.type}),(0,d.jsx)(`span`,{style:{fontSize:`0.875rem`},children:e.path})]},e.path))]})},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '1rem'
  }}>\r
      <IconGrid title="エリア（ステージ / 変更）">\r
        {AREAS.map(area => <IconCell key={area} label={gitAreaAriaLabel(area)} sublabel={area}>\r
            <GitAreaIcon area={area} />\r
          </IconCell>)}\r
      </IconGrid>\r
\r
      <IconGrid title="変更種別（変更・リネームは同色、形状で区別）">\r
        {CHANGE_TYPES.map(type => <IconCell key={type} label={gitChangeAriaLabel(type)} sublabel={type}>\r
            <GitChangeIcon type={type} />\r
          </IconCell>)}\r
      </IconGrid>\r
\r
      <IconGrid title="Porcelain コード対応">\r
        {PORCELAIN_CODES.map(code => {
        const type = porcelainToChangeType(code);
        return <IconCell key={code} label={code === ' ' ? '(空白)' : code} sublabel={type ? gitChangeAriaLabel(type) : '表示なし'}>\r
              {type ? <GitPorcelainIcon code={code} /> : <span style={{
            width: 20,
            height: 20
          }} />}\r
            </IconCell>;
      })}\r
      </IconGrid>\r
    </div>
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'modified'
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'added'
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'deleted'
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'renamed'
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'untracked'
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    type: 'conflict'
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <GitAreaIcon area="staged" />
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <GitAreaIcon area="changes" />
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    width: 320,
    border: '1px solid var(--color-slate-200)',
    borderRadius: '0.375rem',
    overflow: 'hidden',
    background: 'var(--color-surface-main)'
  }}>\r
      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      background: 'var(--color-surface-header)',
      borderBottom: '1px solid var(--color-slate-200)',
      fontSize: '0.8125rem',
      fontWeight: 600,
      color: 'var(--color-slate-700)'
    }}>\r
        <GitAreaIcon area="staged" />\r
        ステージ済み\r
      </div>\r
      {[{
      type: 'modified' as const,
      path: 'src/app.tsx'
    }, {
      type: 'added' as const,
      path: 'src/new-file.ts'
    }].map(row => <div key={row.path} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.375rem 0.75rem',
      borderBottom: '1px solid var(--color-slate-200)'
    }}>\r
          <GitChangeIcon type={row.type} />\r
          <span style={{
        fontSize: '0.875rem'
      }}>\r
            {row.path}\r
          </span>\r
        </div>)}\r
\r
      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      background: 'var(--color-surface-header)',
      borderBottom: '1px solid var(--color-slate-200)',
      fontSize: '0.8125rem',
      fontWeight: 600,
      color: 'var(--color-slate-700)'
    }}>\r
        <GitAreaIcon area="changes" />\r
        変更\r
      </div>\r
      {[{
      type: 'deleted' as const,
      path: 'old/util.ts'
    }, {
      type: 'renamed' as const,
      path: 'src/renamed.ts'
    }, {
      type: 'untracked' as const,
      path: 'notes.md'
    }, {
      type: 'conflict' as const,
      path: 'src/conflict.ts'
    }].map(row => <div key={row.path} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.375rem 0.75rem',
      borderBottom: '1px solid var(--color-slate-200)'
    }}>\r
          <GitChangeIcon type={row.type} />\r
          <span style={{
        fontSize: '0.875rem'
      }}>\r
            {row.path}\r
          </span>\r
        </div>)}\r
    </div>
}`,...T.parameters?.docs?.source}}},E=[`AllIcons`,`Modified`,`Added`,`Deleted`,`Renamed`,`Untracked`,`Conflict`,`StagedArea`,`ChangesArea`,`InFileRow`]}))();export{v as Added,g as AllIcons,w as ChangesArea,S as Conflict,y as Deleted,T as InFileRow,_ as Modified,b as Renamed,C as StagedArea,x as Untracked,E as __namedExportsOrder,f as default};