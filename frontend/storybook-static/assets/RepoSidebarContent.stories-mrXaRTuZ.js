import{i as e,s as t}from"./preload-helper-CT_b8DTk.js";import{C as n}from"./iframe-9Sacgtqn.js";import{t as r}from"./jsx-runtime-DqZldVDK.js";import{r as i,t as a}from"./branchTree-DVBhSfBb.js";import{a as o,c as s,l as c,t as l}from"./BranchIcons-efZhJrmX.js";import{c as u,i as d,l as f,n as p,r as m,s as h,t as g}from"./BranchSection-C5grjKAW.js";import{a as _,c as v,f as y,h as b,i as x,m as S,p as C,r as w,t as T,u as E}from"./sidebarFixtures-CkEXU1rP.js";import{n as D,t as O}from"./WorktreeList-Bket9Sbr.js";function k({branches:e,worktrees:t,selectedBranch:n,selectedWorktree:r,onSelectBranch:a,onSelectWorktree:c,showWorktreeMarks:d=!0,onActivateLocal:f,onActivateRemote:p,onLocalContextMenu:_,onRemoteContextMenu:v}){let{local:y,remote:b}=i(e),x=h(t),C=u(t,r);return(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)(m,{title:`ワークツリー`,icon:(0,A.jsx)(s,{}),children:t.length===0?(0,A.jsx)(`p`,{className:S.emptyInline,children:`ワークツリーがありません`}):(0,A.jsx)(O,{worktrees:t,selectedWorktree:r,onSelect:c})}),e.length===0?(0,A.jsx)(`p`,{className:S.emptyInline,children:`ブランチがありません`}):(0,A.jsxs)(A.Fragment,{children:[(0,A.jsx)(g,{title:`ブランチ`,icon:(0,A.jsx)(l,{}),nodes:y,selectedBranch:n,onSelect:a,checkedOutBranch:C,worktreeBranches:x,showWorktreeMarks:d,onActivate:f,onContextMenu:_}),b.length>0&&(0,A.jsx)(g,{title:`リモート`,icon:(0,A.jsx)(o,{}),nodes:b,selectedBranch:n,onSelect:a,checkedOutBranch:C,worktreeBranches:new Set,onActivate:p,onContextMenu:v})]})]})}var A,j=e((()=>{f(),a(),c(),p(),d(),D(),b(),A=r(),k.__docgenInfo={description:``,methods:[],displayName:`RepoSidebarContent`,props:{branches:{required:!0,tsType:{name:`Array`,elements:[{name:`BranchEntry`}],raw:`BranchEntry[]`},description:``},worktrees:{required:!0,tsType:{name:`Array`,elements:[{name:`WorktreeEntry`}],raw:`WorktreeEntry[]`},description:``},selectedBranch:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``},selectedWorktree:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``},onSelectBranch:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(fullName: string) => void`,signature:{arguments:[{type:{name:`string`},name:`fullName`}],return:{name:`void`}}},description:``},onSelectWorktree:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(path: string) => void`,signature:{arguments:[{type:{name:`string`},name:`path`}],return:{name:`void`}}},description:``},showWorktreeMarks:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`true`,computed:!1}},onActivateLocal:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(fullName: string) => void`,signature:{arguments:[{type:{name:`string`},name:`fullName`}],return:{name:`void`}}},description:``},onActivateRemote:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(fullName: string) => void`,signature:{arguments:[{type:{name:`string`},name:`fullName`}],return:{name:`void`}}},description:``},onLocalContextMenu:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(fullName: string, event: MouseEvent) => void`,signature:{arguments:[{type:{name:`string`},name:`fullName`},{type:{name:`MouseEvent`},name:`event`}],return:{name:`void`}}},description:``},onRemoteContextMenu:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(fullName: string, event: MouseEvent) => void`,signature:{arguments:[{type:{name:`string`},name:`fullName`},{type:{name:`MouseEvent`},name:`event`}],return:{name:`void`}}},description:``}}}})),M,N,P,F,I,L,R,z;e((()=>{M=t(n(),1),j(),C(),_(),N=r(),P={title:`Sidebar/RepoSidebarContent`,component:k,decorators:[e=>(0,N.jsx)(y,{children:(0,N.jsx)(e,{})})],args:{onSelectBranch:()=>{},onSelectWorktree:()=>{}}},F={name:`複合パターン（全体）`,args:{branches:x,worktrees:E,selectedBranch:`feature/hoge`,selectedWorktree:T}},I={name:`選択操作あり`,args:{branches:w,worktrees:v,selectedBranch:`feature/hoge`,selectedWorktree:T,onSelectBranch:()=>{},onSelectWorktree:()=>{}},render:e=>{function t(){let[t,n]=(0,M.useState)(e.selectedBranch),[r,i]=(0,M.useState)(e.selectedWorktree),a=t=>{i(t);let r=e.worktrees.find(e=>e.path===t);r?.branch&&n(r.branch)};return(0,N.jsx)(k,{...e,selectedBranch:t,selectedWorktree:r,onSelectBranch:n,onSelectWorktree:a})}return(0,N.jsx)(t,{})}},L={name:`同期バッジの見え方`,args:{branches:w,worktrees:v.map(e=>({...e,changedFileCount:0})),selectedBranch:`feature/sync-badge`,selectedWorktree:`${T}-wt-sync`}},R={name:`変更ファイルバッジの見え方`,args:{branches:w.map(e=>({...e,aheadCount:0,behindCount:0})),worktrees:v,selectedBranch:`feature/hoge`,selectedWorktree:T}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  name: '複合パターン（全体）',
  args: {
    branches: branchesFullSidebar,
    worktrees: worktreesFullSidebar,
    selectedBranch: 'feature/hoge',
    selectedWorktree: FIXTURE_REPO_ROOT
  }
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  name: '選択操作あり',
  args: {
    branches: branchesComposite,
    worktrees: worktreesComposite,
    selectedBranch: 'feature/hoge',
    selectedWorktree: FIXTURE_REPO_ROOT,
    onSelectBranch: () => {},
    onSelectWorktree: () => {}
  },
  render: args => {
    function InteractiveSidebar() {
      const [selectedBranch, setSelectedBranch] = useState(args.selectedBranch);
      const [selectedWorktree, setSelectedWorktree] = useState(args.selectedWorktree);
      const handleSelectWorktree = (path: string) => {
        setSelectedWorktree(path);
        const worktree = args.worktrees.find(entry => entry.path === path);
        if (worktree?.branch) {
          setSelectedBranch(worktree.branch);
        }
      };
      return <RepoSidebarContent {...args} selectedBranch={selectedBranch} selectedWorktree={selectedWorktree} onSelectBranch={setSelectedBranch} onSelectWorktree={handleSelectWorktree} />;
    }
    return <InteractiveSidebar />;
  }
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  name: '同期バッジの見え方',
  args: {
    branches: branchesComposite,
    worktrees: worktreesComposite.map(entry => ({
      ...entry,
      changedFileCount: 0
    })),
    selectedBranch: 'feature/sync-badge',
    selectedWorktree: \`\${FIXTURE_REPO_ROOT}-wt-sync\`
  }
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  name: '変更ファイルバッジの見え方',
  args: {
    branches: branchesComposite.map(entry => ({
      ...entry,
      aheadCount: 0,
      behindCount: 0
    })),
    worktrees: worktreesComposite,
    selectedBranch: 'feature/hoge',
    selectedWorktree: FIXTURE_REPO_ROOT
  }
}`,...R.parameters?.docs?.source}}},z=[`FullPatterns`,`Interactive`,`AheadBehindFocus`,`ChangesFocus`]}))();export{L as AheadBehindFocus,R as ChangesFocus,F as FullPatterns,I as Interactive,z as __namedExportsOrder,P as default};