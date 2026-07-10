import{i as e}from"./preload-helper-CT_b8DTk.js";import{t}from"./jsx-runtime-DqZldVDK.js";import{n,t as r}from"./CountBadge-CoK1RSyt.js";function i({title:e,children:t}){return(0,c.jsxs)(`section`,{style:{display:`flex`,flexDirection:`column`,gap:`0.75rem`},children:[(0,c.jsx)(`h3`,{style:{margin:0,fontSize:`0.875rem`,fontWeight:600,color:`var(--color-slate-700)`},children:e}),t]})}function a({icon:e,label:t,sublabel:n,badges:r}){return(0,c.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.375rem`,padding:`0.375rem 0.5rem`,minWidth:0},children:[(0,c.jsx)(`span`,{style:{flexShrink:0,color:`var(--color-slate-400)`},children:e}),(0,c.jsxs)(`span`,{style:{display:`flex`,flexDirection:`column`,minWidth:0,flex:1},children:[(0,c.jsxs)(`span`,{style:{display:`flex`,alignItems:`center`,gap:`0.375rem`,minWidth:0},children:[(0,c.jsx)(`span`,{style:{overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`,fontSize:`0.8125rem`},children:t}),r]}),n&&(0,c.jsx)(`span`,{style:{fontSize:`0.75rem`,color:`var(--color-slate-500)`,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:n})]})]})}function o(){return(0,c.jsx)(`svg`,{width:`14`,height:`14`,viewBox:`0 0 24 24`,fill:`none`,"aria-hidden":!0,children:(0,c.jsx)(`path`,{d:`M6 3v12M18 9a3 3 0 1 0-2.83-4M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z`,stroke:`currentColor`,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`})})}function s(){return(0,c.jsx)(`svg`,{width:`14`,height:`14`,viewBox:`0 0 24 24`,fill:`none`,"aria-hidden":!0,children:(0,c.jsx)(`path`,{d:`M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z`,stroke:`currentColor`,strokeWidth:`2`,strokeLinejoin:`round`})})}var c,l,u,d,f,p,m,h,g,_;e((()=>{n(),c=t(),l={title:`UI/CountBadge`,component:r,args:{count:23,variant:`ahead`},argTypes:{variant:{control:`select`,options:[`ahead`,`behind`,`changes`]}}},u=[{variant:`ahead`,title:`プッシュ待ち（↑）`,description:`リモートより先行しているコミット数`},{variant:`behind`,title:`プル待ち（↓）`,description:`リモートより遅れているコミット数`},{variant:`changes`,title:`変更ファイル数`,description:`未コミットの変更ファイル数（ワークツリー）`}],d=[1,5,23,99,150],f={args:{variant:`ahead`,count:23}},p={args:{variant:`behind`,count:23}},m={args:{variant:`changes`,count:5}},h={render:()=>(0,c.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1.5rem`,padding:`1rem`},children:[(0,c.jsx)(i,{title:`バリアント`,children:(0,c.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:`1rem`},children:u.map(({variant:e,title:t,description:n})=>(0,c.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,alignItems:`center`,gap:`0.5rem`,padding:`0.75rem 1rem`,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,background:`var(--color-white)`,minWidth:`7rem`},children:[(0,c.jsx)(r,{count:23,variant:e}),(0,c.jsxs)(`div`,{style:{textAlign:`center`},children:[(0,c.jsx)(`div`,{style:{fontSize:`0.8125rem`,fontWeight:600,color:`var(--color-slate-700)`},children:t}),(0,c.jsx)(`div`,{style:{fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:n})]})]},e))})}),(0,c.jsx)(i,{title:`件数の見え方`,children:(0,c.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`0.75rem`},children:u.map(({variant:e,title:t})=>(0,c.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.75rem`,flexWrap:`wrap`},children:[(0,c.jsx)(`span`,{style:{width:`8rem`,fontSize:`0.75rem`,color:`var(--color-slate-500)`},children:t}),d.map(t=>(0,c.jsx)(r,{count:t,variant:e},t))]},e))})})]})},g={render:()=>(0,c.jsxs)(`div`,{style:{width:280,border:`1px solid var(--color-slate-200)`,borderRadius:`0.375rem`,overflow:`hidden`,background:`var(--color-surface-main)`},children:[(0,c.jsx)(`div`,{style:{padding:`0.5rem 0.75rem`,fontSize:`0.75rem`,fontWeight:600,color:`var(--color-slate-500)`,background:`var(--color-surface-header)`,borderBottom:`1px solid var(--color-slate-200)`},children:`ブランチ`}),(0,c.jsx)(a,{icon:(0,c.jsx)(o,{}),label:`feature/sync-badge`,badges:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(r,{count:5,variant:`behind`}),(0,c.jsx)(r,{count:23,variant:`ahead`})]})}),(0,c.jsx)(a,{icon:(0,c.jsx)(o,{}),label:`main`,badges:(0,c.jsx)(r,{count:3,variant:`behind`})}),(0,c.jsx)(a,{icon:(0,c.jsx)(o,{}),label:`develop`,badges:(0,c.jsx)(r,{count:12,variant:`ahead`})}),(0,c.jsx)(`div`,{style:{padding:`0.5rem 0.75rem`,fontSize:`0.75rem`,fontWeight:600,color:`var(--color-slate-500)`,background:`var(--color-surface-header)`,borderTop:`1px solid var(--color-slate-200)`,borderBottom:`1px solid var(--color-slate-200)`},children:`ワークツリー`}),(0,c.jsx)(a,{icon:(0,c.jsx)(s,{}),label:`wt-manager`,sublabel:`main`,badges:(0,c.jsx)(r,{count:7,variant:`changes`})}),(0,c.jsx)(a,{icon:(0,c.jsx)(s,{}),label:`wt-manager-feature`,sublabel:`feature/sync-badge`})]})},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'ahead',
    count: 23
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'behind',
    count: 23
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'changes',
    count: 5
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '1rem'
  }}>\r
      <ShowcaseGrid title="バリアント">\r
        <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>\r
          {VARIANTS.map(({
          variant,
          title,
          description
        }) => <div key={variant} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          border: '1px solid var(--color-slate-200)',
          borderRadius: '0.375rem',
          background: 'var(--color-white)',
          minWidth: '7rem'
        }}>\r
              <CountBadge count={23} variant={variant} />\r
              <div style={{
            textAlign: 'center'
          }}>\r
                <div style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-slate-700)'
            }}>\r
                  {title}\r
                </div>\r
                <div style={{
              fontSize: '0.75rem',
              color: 'var(--color-slate-500)'
            }}>\r
                  {description}\r
                </div>\r
              </div>\r
            </div>)}\r
        </div>\r
      </ShowcaseGrid>\r
\r
      <ShowcaseGrid title="件数の見え方">\r
        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>\r
          {VARIANTS.map(({
          variant,
          title
        }) => <div key={variant} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>\r
              <span style={{
            width: '8rem',
            fontSize: '0.75rem',
            color: 'var(--color-slate-500)'
          }}>\r
                {title}\r
              </span>\r
              {SAMPLE_COUNTS.map(count => <CountBadge key={count} count={count} variant={variant} />)}\r
            </div>)}\r
        </div>\r
      </ShowcaseGrid>\r
    </div>
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: 280,
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
      background: 'var(--color-surface-header)',
      borderBottom: '1px solid var(--color-slate-200)'
    }}>\r
        ブランチ\r
      </div>\r
      <SidebarRow icon={<BranchIcon />} label="feature/sync-badge" badges={<>\r
            <CountBadge count={5} variant="behind" />\r
            <CountBadge count={23} variant="ahead" />\r
          </>} />\r
      <SidebarRow icon={<BranchIcon />} label="main" badges={<CountBadge count={3} variant="behind" />} />\r
      <SidebarRow icon={<BranchIcon />} label="develop" badges={<CountBadge count={12} variant="ahead" />} />\r
\r
      <div style={{
      padding: '0.5rem 0.75rem',
      fontSize: '0.75rem',
      fontWeight: 600,
      color: 'var(--color-slate-500)',
      background: 'var(--color-surface-header)',
      borderTop: '1px solid var(--color-slate-200)',
      borderBottom: '1px solid var(--color-slate-200)'
    }}>\r
        ワークツリー\r
      </div>\r
      <SidebarRow icon={<FolderIcon />} label="wt-manager" sublabel="main" badges={<CountBadge count={7} variant="changes" />} />\r
      <SidebarRow icon={<FolderIcon />} label="wt-manager-feature" sublabel="feature/sync-badge" />\r
    </div>
}`,...g.parameters?.docs?.source}}},_=[`Ahead`,`Behind`,`Changes`,`AllVariants`,`InSidebarContext`]}))();export{f as Ahead,h as AllVariants,p as Behind,m as Changes,g as InSidebarContext,_ as __namedExportsOrder,l as default};