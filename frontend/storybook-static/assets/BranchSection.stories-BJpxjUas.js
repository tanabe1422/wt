import{i as e}from"./preload-helper-CT_b8DTk.js";import{t}from"./jsx-runtime-DqZldVDK.js";import{r as n,t as r}from"./branchTree-DVBhSfBb.js";import{l as i,t as a}from"./BranchIcons-efZhJrmX.js";import{l as o,n as s,s as c,t as l}from"./BranchSection-C5grjKAW.js";import{a as u,c as d,f,n as p,p as m,r as h}from"./sidebarFixtures-CkEXU1rP.js";var g,_,v,y,b,x,S,C,w,T,E,D,O;e((()=>{r(),i(),s(),m(),u(),o(),g=t(),_={title:`Sidebar/BranchSection`,component:l,decorators:[e=>(0,g.jsx)(f,{children:(0,g.jsx)(e,{})})],args:{title:`ブランチ`,icon:(0,g.jsx)(a,{}),selectedBranch:null,onSelect:()=>{},checkedOutBranch:null,worktreeBranches:new Set,showWorktreeMarks:!1}},v=n(p).local,y={name:`同期済み（バッジなし）`,args:{nodes:v,selectedBranch:`sync/clean`}},b={name:`プッシュ待ちのみ（↑）`,args:{nodes:v,selectedBranch:`sync/ahead-only`}},x={name:`プル待ちのみ（↓）`,args:{nodes:v,selectedBranch:`sync/behind-only`}},S={name:`プッシュ・プル両方`,args:{nodes:v,selectedBranch:`sync/ahead-behind`}},C={name:`大きな件数`,args:{nodes:v,selectedBranch:`sync/large-counts`}},w=n(h).local,T=c(d),E={name:`ワークツリーアイコン（カバン）`,args:{nodes:w,selectedBranch:`feature/hoge`,checkedOutBranch:`feature/hoge`,worktreeBranches:T,showWorktreeMarks:!0}},D={name:`ネストしたブランチ名`,args:{nodes:w,selectedBranch:`feature/sync-badge`,checkedOutBranch:`feature/hoge`,worktreeBranches:T,showWorktreeMarks:!0,defaultExpanded:!0}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: '同期済み（バッジなし）',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/clean'
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: 'プッシュ待ちのみ（↑）',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/ahead-only'
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: 'プル待ちのみ（↓）',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/behind-only'
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  name: 'プッシュ・プル両方',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/ahead-behind'
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  name: '大きな件数',
  args: {
    nodes: badgePatternNodes,
    selectedBranch: 'sync/large-counts'
  }
}`,...C.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  name: 'ワークツリーアイコン（カバン）',
  args: {
    nodes: compositeLocal,
    selectedBranch: 'feature/hoge',
    checkedOutBranch: 'feature/hoge',
    worktreeBranches: compositeWorktreeBranches,
    showWorktreeMarks: true
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  name: 'ネストしたブランチ名',
  args: {
    nodes: compositeLocal,
    selectedBranch: 'feature/sync-badge',
    checkedOutBranch: 'feature/hoge',
    worktreeBranches: compositeWorktreeBranches,
    showWorktreeMarks: true,
    defaultExpanded: true
  }
}`,...D.parameters?.docs?.source}}},O=[`SyncClean`,`AheadOnly`,`BehindOnly`,`AheadAndBehind`,`LargeCounts`,`WithWorktreeIcon`,`NestedBranches`]}))();export{S as AheadAndBehind,b as AheadOnly,x as BehindOnly,C as LargeCounts,D as NestedBranches,y as SyncClean,E as WithWorktreeIcon,O as __namedExportsOrder,_ as default};