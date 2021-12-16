xmas2021
----------

企画部(irodori)と共同した2021年クリスマス企画において，サーバーサイドで動作するコード

Twitterが提供するAccount Activity APIのWebhookとRealtime filter streamのAPIから指定された情報を収集します．その後，定義されたルールに応じて点灯パターンを決定し，Google Cloud IoT Coreを通じてイルミネーション制御デバイスに配信します．

関連レポジトリ
- [xmas2021-frontend](https://github.com/StudioAquatan/xmas2021-frontend) 簡易的なフロントエンド
- [xmas2021-micon](https://github.com/StudioAquatan/xmas2021-micon) ESP32によるイルミネーション制御デバイスのコード

# Setup
## 依存関係

* Node.js 16.x (14.xにおいても動作確認済み)
* Google Cloud IoT Core
* Twitter API (Account Activity APIが利用できるTier)
  * environmentの設定が必要

1. Realtime filter streamはポーリング型であるため，このプログラムが常時稼働できるサーバが必要です．負担は高くないので大掛かりなものは必要ありません．
1. また，Twitterのwebhookはhttps経由で呼ばれる必要があるので，nginxなどを利用したリバースプロキシが必要です．このプログラムにおいてSSL対応はありません．CORS対応についてもないため注意が必要です．
1. データベースはSQLiteです．

## 環境構築
### Google Cloud IoT Core
* レジストリを作成し，デバイスを登録します．
* ESP32から送信されるメトリクスを受信できるようにPubSubトピックを作成して関連付けておきます
* IoT Coreに対して権限のあるサービスアカウントを準備し，秘密鍵JSONをダウンロードしておきます

### Twitter API
* アプリを作成し，Consumer Key，Consumer Secret，Bearer Tokenを取得しておきます．権限はRead & Write, direct messagesとします(Webhook周りで必要)．
* Account Activity APIのEnvironmentに作成したアプリを関連付けます．
* 無料枠では1つしかWebhookが登録できないので，すでに登録されている場合頑張って削除してください．

### サーバ
* 任意のFQDNを使ってHTTPSでアクセスできるようにします(オレオレ証明書不可)．おおよその場合`https://[fqdn]/api/twitter/webhook`がWebhookのURLとなります．

### 環境変数
`.env.example`を参照してください．特筆すべきものは以下に示します．

* `TWITTER_CALLBACK`: `https://[fqdn]/api/twitter/login`におおよそなります．
* `TWITTER_WEBHOOK_URL`: `https://[fqdn]/api/twitter/webhook`におおよそなります．Webhookを送る先はHTTPSでないといけません．
* `GOOGLE_APPLICATION_CREDENTIALS`: IoT Core向けサービスアカウントの秘密鍵JSONへのパスを指定します
* `TWITTER_ALLOWED_ID`: ログイン許可するTwitterアカウントのIDを`,`で繋げて記入します

## 実行
```sh
yarn build
yarn start
```
データベースはカレントディレクトリの`data.db`に書き込まれます．

### APIドキュメント
To be done
