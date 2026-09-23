# Windows システムユーティリティ

このメモリは Shell に頼らざるを得ない場合の最低限のフォールバック参考。基本的に Serena や他の純正ツールを優先する。

## 推奨 Shell スタイル

Shell が必要な場面では PowerShell を使う。**文字化け回避のため、コマンドの先頭に `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;` を前置すること。**

なお、この環境の PowerShell は Windows PowerShell 5.1 のため `&&` / `||` / 三項演算子 / `??` は使えない。`A; if ($?) { B }` の形にする。POSIX スクリプトが必要な場合は Bash ツール側を使う。

よく使う読み取り専用コマンド:

```powershell
Get-ChildItem
Get-ChildItem -Recurse -Filter *.js
Get-Content path\to\file
Select-String -Path *.js -Pattern "text"
```

## 安全な Git の参照操作

```powershell
git status
git diff
git log --oneline -n 20
```

## 既定で避ける

- 破壊的な Git コマンド
- 明示の依頼がない限り commit / push 系のコマンド
- Serena でより精密に検査・編集できる箇所での広範な Shell 利用
