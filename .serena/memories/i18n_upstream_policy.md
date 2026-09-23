# i18n / upstream 方針

- **upstream 由来の i18n 変更は触らない・追従しない。**
- `upstream/master` マージ時に `en.json` / `ja.json` など localization の差分を、fork 側で補完・同期する必要はない。
- レビューでも「upstream で増えたキーが ja.json にない」といった指摘はしない（意図的な方針）。
- fork 独自文言の追加・変更だけが localization 編集の対象。エージェントは既存ルール通り、明示指示がない限り i18n JSON を変更しない。
