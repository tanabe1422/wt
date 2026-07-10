import{i as e}from"./preload-helper-CT_b8DTk.js";import{t}from"./jsx-runtime-DqZldVDK.js";import{a as n,d as r,f as i,l as a,o,p as s,s as c,t as l}from"./sidebarFixtures-CkEXU1rP.js";import{n as u,t as d}from"./WorktreeList-Bket9Sbr.js";var f,p,m,h,g,_,v;e((()=>{u(),s(),n(),f=t(),p={title:`Sidebar/WorktreeList`,component:d,decorators:[e=>(0,f.jsx)(i,{children:(0,f.jsx)(e,{})})],args:{selectedWorktree:l,onSelect:()=>{}}},m={name:`変更なし`,args:{worktrees:c,selectedWorktree:l}},h={name:`変更ファイル数のバリエーション`,args:{worktrees:o,selectedWorktree:l}},g={name:`メインのみ変更あり`,args:{worktrees:r,selectedWorktree:l}},_={name:`detached ワークツリー`,args:{worktrees:a,selectedWorktree:`${l}-wt-detached`}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: '変更なし',
  args: {
    worktrees: worktreesClean,
    selectedWorktree: FIXTURE_REPO_ROOT
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: '変更ファイル数のバリエーション',
  args: {
    worktrees: worktreesChangeCounts,
    selectedWorktree: FIXTURE_REPO_ROOT
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: 'メインのみ変更あり',
  args: {
    worktrees: worktreesMainDirty,
    selectedWorktree: FIXTURE_REPO_ROOT
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  name: 'detached ワークツリー',
  args: {
    worktrees: worktreesDetached,
    selectedWorktree: \`\${FIXTURE_REPO_ROOT}-wt-detached\`
  }
}`,..._.parameters?.docs?.source}}},v=[`NoChanges`,`ChangeCounts`,`MainDirtyOnly`,`Detached`]}))();export{h as ChangeCounts,_ as Detached,g as MainDirtyOnly,m as NoChanges,v as __namedExportsOrder,p as default};