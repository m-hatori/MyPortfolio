//●●●スプレッドシート API●●●
const SECRET = require("./secret.js");
const {GoogleSpreadsheet} = require("google-spreadsheet");  

//スプレッドシート ドキュメント instance
module.exports.dbSS_ProductsList = {
  doc: new GoogleSpreadsheet(process.env.SPREADSHEETID_PRODUCTS),
  init_state: false,
}
module.exports.dbSS_OrderList = {
  doc:  new GoogleSpreadsheet(process.env.SPREADSHEETID_ORDER),
  init_state: false
}

//初期化
let creds
const auth  = async (document) => {
  if(!creds){creds = JSON.parse(await SECRET.getString(process.env.SPREADSHHET_SEVICE_ACCOUNT_NAME, process.env.SPREADSHHET_SEVICE_ACCOUNT_VERSION));}
  await document.useServiceAccountAuth(creds);    
}

module.exports.initializeSpreadsheet = async (db) => {
  if(!db.init_state){
    await auth(db.doc)
    await db.doc.loadInfo()
    db.init_state = true;
    console.log(`初期化完了 ${db.doc.title} STATE: ${db.init_state}`)
    return false
  }
  else{
    return true;
  }
}
/*
module.exports.initializeSpreadsheet = async (db) => {
  if(!db.init_state){
    console.log(`初期化STATE: ${db.init_state}`)
    await auth(db.doc)
    await db.doc.loadInfo()
    db.init_state = true;
    console.log(`初期化STATE: ${db.init_state}`)
    return false
  }
  else{
    return true;
  }    
}
*/ 

/*
●流れ
Firestore_API.js にてデプロイ後に実行 (1回のみ
スプレッドシートドキュメント グローバル定義
スプレッドシートドキュメント 初期化
スプレッドシートドキュメント ロード 読み取り専用の各シートを取得できる

シート操作 ProductsList, OrderListクラスでキャッシュを作成し操作する

以下は必要あるか様子を見る。
各シートの値読み込みは、セルや行を読み込んだ後に行われるため、
おそらくスプレッドシートのプロパティ変更後や
シートの増減後に実行すべきメソッドと思われる。

シートを再ロードする
・発注リストに新規発注情報を挿入した後
・在庫を更新した後
resetLocalCache()
loadInfo()
Aさんにて再ロード中にBさんが発注処理をした場合、
ユニークなドキュメントがいじられてしまうが、問題ないか。


●スプレッドシートの取得タイミング
商品リスト
・現在庫の更新 firestoreで現在庫は監視すればよく、値を入れ込むだけ。
・商品リストが更新されたとき
→ 商品リストが更新されたときのみ

発注リスト
・発注情報の閲覧 急がない
・発注履歴の挿入 急がない
→ 発注直後のみ
*/

  
//スプレッドシート キャッシュの更新
/*
module.exports.updateSpreadSheet = async (db) =>{
  if(await module.exports.initializeSpreadsheet(db)){
    console.time(`スプレッドシート ${db.doc.title} キャッシュクリア`)
    await db.doc.resetLocalCache()
    console.timeEnd(`スプレッドシート ${db.doc.title} キャッシュクリア`)

    console.time(`スプレッドシート ${db.doc.title} ロード`)
    await db.doc.loadInfo()
    console.timeEnd(`スプレッドシート ${db.doc.title} ロード`)
  }
}
*/