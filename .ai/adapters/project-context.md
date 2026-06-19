# Project Context
# init-project.ps1 がこのファイルを読み、テンプレートの {placeholder} を置換する。
# 新規プロジェクト開始時にこのファイルをコピーし、各項目を埋めて使う。

## プロジェクト概要
project_name: my-project
project_description: プロジェクトの説明をここに書く

## 技術スタック
language: TypeScript
framework: React
package_manager: npm
runtime: Node.js 20

## コマンド
cmd_install: npm install
cmd_dev: npm run dev
cmd_build: npm run build
cmd_test: npm test
cmd_lint: npm run lint

## ディレクトリ構成
# directory_structure に展開される。インデント付きツリー形式で記述。
directory_structure: |
  src/
    components/
    pages/
    utils/
  tests/
  public/

## NEVER — 絶対にやってはいけないこと
# 運用中に発見したルールを追記していく。1行1項目。
never_item_1: ここにアンチパターンを書く
never_item_2: ここにアンチパターンを書く

## コード例
# テンプレートに挿入されるコードパターン。
code_lang: typescript
code_example_1: |
  // 推奨パターンをここに書く
