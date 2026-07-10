import{i as e,s as t}from"./preload-helper-CT_b8DTk.js";import{C as n}from"./iframe-9Sacgtqn.js";import{t as r}from"./jsx-runtime-DqZldVDK.js";import{n as i,t as a}from"./ErrorDialog-DS5B-OEW.js";function o(){let[e,t]=(0,s.useState)(!1);return(0,c.jsxs)(`div`,{style:{padding:`1rem`},children:[(0,c.jsx)(`button`,{type:`button`,onClick:()=>t(!0),children:`エラーを表示`}),(0,c.jsx)(a,{open:e,message:`操作を完了できませんでした。`,onClose:()=>t(!1)})]})}var s,c,l,u,d,f,p,m,h;e((()=>{s=t(n(),1),i(),c=r(),l={title:`UI/ErrorDialog`,component:a,parameters:{layout:`fullscreen`},args:{onClose:()=>void 0}},u={args:{open:!0,message:`リポジトリの読み込みに失敗しました。`}},d={args:{open:!0,title:`コミットに失敗しました`,message:`コミットメッセージが空です。メッセージを入力してから再度お試しください。`}},f={args:{open:!0,title:`プッシュに失敗しました`,message:`3 件のブランチをプッシュできませんでした。`,items:[{label:`feature/sync-badge`,detail:`rejected: non-fast-forward`},{label:`hotfix/login`,detail:`remote: Permission denied`},{label:`develop`,detail:`failed to connect to origin`}]}},p={args:{open:!0,title:`Git 操作エラー`,message:`git push に失敗しました。

リモートの変更を取り込んでから再度プッシュしてください。`}},m={render:()=>(0,c.jsx)(o,{}),args:{open:!1,message:``,onClose:()=>void 0}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    open: true,
    message: 'リポジトリの読み込みに失敗しました。'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    open: true,
    title: 'コミットに失敗しました',
    message: 'コミットメッセージが空です。メッセージを入力してから再度お試しください。'
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    open: true,
    title: 'プッシュに失敗しました',
    message: '3 件のブランチをプッシュできませんでした。',
    items: [{
      label: 'feature/sync-badge',
      detail: 'rejected: non-fast-forward'
    }, {
      label: 'hotfix/login',
      detail: 'remote: Permission denied'
    }, {
      label: 'develop',
      detail: 'failed to connect to origin'
    }]
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    open: true,
    title: 'Git 操作エラー',
    message: 'git push に失敗しました。\\n\\nリモートの変更を取り込んでから再度プッシュしてください。'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <InteractiveDemo />,
  args: {
    open: false,
    message: '',
    onClose: () => undefined
  }
}`,...m.parameters?.docs?.source}}},h=[`Default`,`CustomTitle`,`WithItems`,`MultilineMessage`,`Interactive`]}))();export{d as CustomTitle,u as Default,m as Interactive,p as MultilineMessage,f as WithItems,h as __namedExportsOrder,l as default};