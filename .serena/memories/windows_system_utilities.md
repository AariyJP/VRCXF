# Windowsシステムユーティリティコマンド

## ファイルシステム操作

### ディレクトリ操作

```cmd
# 現在のディレクトリ表示
cd

# ディレクトリ移動
cd パス

# 親ディレクトリに移動
cd ..

# ルートディレクトリに移動
cd \

# ドライブ変更
D:

# ディレクトリ作成
mkdir ディレクトリ名
md ディレクトリ名

# ディレクトリ削除 (空の場合)
rmdir ディレクトリ名
rd ディレクトリ名

# ディレクトリ削除 (中身ごと、確認なし)
rmdir /S /Q ディレクトリ名
rd /S /Q ディレクトリ名

# ディレクトリ一覧
dir

# 詳細表示
dir /A

# サブディレクトリも含めて表示
dir /S

# ファイルのみ表示
dir /A-D

# ディレクトリのみ表示
dir /AD
```

### ファイル操作

```cmd
# ファイル内容表示
type ファイル名

# ファイルコピー
copy ソース 宛先

# ディレクトリコピー (サブディレクトリ含む)
xcopy /E /I ソース 宛先

# ファイル移動
move ソース 宛先

# ファイル削除
del ファイル名

# ファイル削除 (確認なし)
del /Q ファイル名

# ワイルドカード使用
del *.log
del /Q /S *.tmp

# ファイル検索
where ファイル名

# ディレクトリ内のファイル検索
dir /S /B ファイル名

# ファイル名変更
ren 旧ファイル名 新ファイル名
rename 旧ファイル名 新ファイル名
```

## テキスト検索

### findstr (grep相当)

```cmd
# ファイル内のテキスト検索
findstr "検索文字列" ファイル名

# 複数ファイルから検索
findstr "検索文字列" *.js

# 再帰的に検索
findstr /S "検索文字列" *.js

# 大文字小文字を区別しない
findstr /I "検索文字列" ファイル名

# 正規表現使用
findstr /R "パターン" ファイル名

# 行番号表示
findstr /N "検索文字列" ファイル名

# 複数パターン検索
findstr /C:"パターン1" /C:"パターン2" ファイル名
```

## プロセス管理

```cmd
# プロセス一覧
tasklist

# 特定のプロセス検索
tasklist | findstr "プロセス名"

# プロセス終了 (PID指定)
taskkill /PID プロセスID

# プロセス終了 (名前指定)
taskkill /IM プロセス名.exe

# 強制終了
taskkill /F /PID プロセスID
taskkill /F /IM プロセス名.exe

# 複数プロセス終了
taskkill /F /IM node.exe
taskkill /F /IM electron.exe
```

## ネットワーク

```cmd
# ネットワーク接続状態
netstat

# リスニングポート表示
netstat -an | findstr LISTENING

# 特定ポートの使用状況
netstat -ano | findstr :9000

# IPアドレス確認
ipconfig

# 詳細情報
ipconfig /all

# DNS キャッシュクリア
ipconfig /flushdns

# ping
ping ホスト名またはIPアドレス

# traceroute
tracert ホスト名またはIPアドレス
```

## 環境変数

```cmd
# 環境変数一覧
set

# 特定の環境変数表示
echo %PATH%
echo %USERPROFILE%
echo %TEMP%

# 環境変数設定 (現在のセッションのみ)
set 変数名=値

# 環境変数削除
set 変数名=

# 永続的な環境変数設定 (システム全体)
setx 変数名 値

# 永続的な環境変数設定 (ユーザー)
setx 変数名 値 /M
```

## システム情報

```cmd
# システム情報表示
systeminfo

# OS バージョン
ver

# コンピューター名
hostname

# 現在のユーザー
whoami

# ディスク使用量
wmic logicaldisk get size,freespace,caption
```

## パーミッション

```cmd
# ファイル/ディレクトリの所有者変更
takeown /F ファイル名

# アクセス権限表示
icacls ファイル名

# アクセス権限変更
icacls ファイル名 /grant ユーザー名:F
```

## 圧縮/解凍

```cmd
# PowerShell で圧縮
powershell Compress-Archive -Path ソース -DestinationPath 出力.zip

# PowerShell で解凍
powershell Expand-Archive -Path 入力.zip -DestinationPath 出力先

# 7-Zip 使用 (インストール済みの場合)
7z a 出力.zip ソース
7z x 入力.zip
```

## Git 操作

```cmd
# ステータス確認
git status

# 変更内容確認
git diff

# ステージング
git add .
git add ファイル名

# コミット
git commit -m "コミットメッセージ"

# プッシュ
git push

# プル
git pull

# ブランチ一覧
git branch

# ブランチ作成
git branch ブランチ名

# ブランチ切り替え
git checkout ブランチ名

# ブランチ作成 + 切り替え
git checkout -b ブランチ名

# ログ表示
git log
git log --oneline

# リモートリポジトリ確認
git remote -v

# 変更の取り消し (未ステージング)
git checkout -- ファイル名

# ステージングの取り消し
git reset HEAD ファイル名

# 直前のコミット修正
git commit --amend
```

## PowerShell 操作

```powershell
# PowerShell 起動
powershell

# 管理者権限で PowerShell 起動
powershell -Command "Start-Process powershell -Verb RunAs"

# スクリプト実行
powershell -ExecutionPolicy Bypass -File スクリプト.ps1

# ディレクトリ一覧 (PowerShell)
Get-ChildItem
ls
dir

# ファイル内容表示 (PowerShell)
Get-Content ファイル名
cat ファイル名

# ファイル検索 (PowerShell)
Get-ChildItem -Recurse -Filter "*.js"

# テキスト検索 (PowerShell)
Select-String -Path "*.js" -Pattern "検索文字列"
```

## その他のユーティリティ

```cmd
# 画面クリア
cls

# コマンド履歴
doskey /history

# ファイルハッシュ計算 (PowerShell)
powershell Get-FileHash ファイル名 -Algorithm SHA256

# 日時表示
date /T
time /T

# エコー
echo メッセージ

# 一時停止
pause

# 終了
exit
```

## バッチファイル

```cmd
# バッチファイル実行
バッチファイル.bat

# 引数付きで実行
バッチファイル.bat 引数1 引数2

# バッチファイル内でのコメント
REM これはコメントです

# エコーオフ (コマンド表示を抑制)
@echo off

# 変数設定
set VAR=値

# 変数使用
echo %VAR%

# 条件分岐
if exist ファイル名 (
    echo ファイルが存在します
) else (
    echo ファイルが存在しません
)

# ループ
for %%i in (*.txt) do echo %%i
```

## トラブルシューティング

```cmd
# ポートを使用しているプロセスを特定
netstat -ano | findstr :ポート番号
tasklist | findstr "PID"

# ファイルロックを解除
# (プロセスを終了する必要がある)
taskkill /F /IM プロセス名.exe

# ディスクチェック
chkdsk C: /F

# システムファイルチェック
sfc /scannow
```
