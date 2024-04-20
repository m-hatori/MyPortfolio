/* eslint-disable node/no-missing-require */
/* eslint-disable one-var */
const functions = require('firebase-functions');
const logger = functions.logger
const property = require("../property.js");
const AsyncLock = require(`async-lock`);

const max_retryTime = 5 //再試行最大回数
const retryDelayTime = 100 //再試行遅延時間 ms

//排他制御
const lock = new AsyncLock({
  //timeout: 60*1000, // タイムアウトを指定 - ロックを取得する前にアイテムがキューに留まることができる最大時間
  //maxOccupationTime: 60*1000, // 最大占有時間を指定 - キューに入ってから実行を完了するまでの最大許容時間
  maxExecutionTime: 5*60*1000, // 最大実行時間を指定 - ロックを取得してから実行を完了するまでの最大許容時間
  //maxPending: 10 // 保留中のタスクの最大数を設定 - 一度にキューで許可されるタスクの最大数
});


//Cloud Functionsで初期化
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
initializeApp();
const db = getFirestore();


//独自のサーバーで初期化
/*
const fs = require('fs')
const admin = require("firebase-admin");

//初期化
const getAdmin = async () => {
  if (!admin.apps.length) {
    const SECRET = JSON.parse(fs.readFileSync("./functions/test/linebot-for-employee-6e1c9c45478c.json", 'utf8'))
    admin.initializeApp({ credential: admin.credential.cert(SECRET)});
  }
}
getAdmin()
const db = admin.firestore()
*/

//コレクション
const dbCollection = db.collection("LINEBot")

// リファレンス
module.exports.dbRef = {
  List: dbCollection.doc("List"),
  ProductsInfo: dbCollection.doc("ProductsInfo"),
  order: dbCollection.doc("order"),
  plSheet: dbCollection.doc("plSheet"),
  user_buyer: dbCollection.doc("user_buyer"),  
}

// データ instance
const dbData = {
  List: [],
  ProductsInfo: {},
  order: {all: []},
  plSheet: {},
  user_buyer: {},
}


//Read クライアントサイドからのDB変更リスナー
module.exports.dbRef.List
.onSnapshot(async snapshot => await module.exports.accessFirestore("snapshotUpdate", snapshot))

module.exports.dbRef.ProductsInfo
.onSnapshot(async snapshot => await module.exports.accessFirestore("snapshotUpdate", snapshot))

module.exports.dbRef.order
.onSnapshot(async snapshot => await module.exports.accessFirestore("snapshotUpdate", snapshot))

module.exports.dbRef.plSheet
.onSnapshot(async snapshot => await module.exports.accessFirestore("snapshotUpdate", snapshot))

module.exports.dbRef.user_buyer
.onSnapshot(async snapshot => await module.exports.accessFirestore("snapshotUpdate", snapshot))

/*
//Read サーバーサイドからのDB変更リスナー
const functions = require('firebase-functions');
module.exports.serverObserver = functions.firestore
  .document('{colName}/{docName}')
  .onUpdate((change, context) => {
    const colName = context.params.colName; // コレクション名
    const docName = context.params.docName; // ドキュメント名    
    console.log(`firestore update from serverSide: ${colName}/${docName}`)

    const updatedData = change.after.data();
    dbData[docName] = updatedData  
    return null;
  });
*/

//Write 現在庫更新
const setNewStockTofirestore = async (plSheets) => {
  for(let sheetId in plSheets){    
    
    for(let buff of plSheets[sheetId].order){
      //console.log(buff)
      dbData.plSheet[sheetId][buff.pId][property.constPL.columns.stockNow] = buff.newStock
      console.log(`--firestore 現在庫更新 商品No.${buff.pId} ${buff.productName} 現在庫 ${buff.newStock}`)
    }
    
    module.exports.dbRef.plSheet.update({[sheetId]: dbData.plSheet[sheetId]});  //firestore更新
  }
  return
}

//Write 発注情報更新
const setNewOrderTofirestore = async (userId, orderArrays) => {  
  if(dbData.order.all === undefined || dbData.order.all === null){dbData.order.all = []}
  if(dbData.order[userId] === undefined || dbData.order[userId] === null){dbData.order[userId] = []}
  //console.log(orderRecords.orderRecordsOfUser)

  for(let buff of orderArrays){
    let _buff = JSON.stringify(buff)
    dbData.order[userId].unshift(_buff) //ユーザー別発注情報に追記
    dbData.order.all.unshift(_buff)//全発注情報に追記
  }
    
  //firestore更新
  const maxOrderAll = 200 //最大200件
  if(dbData.order.all.length > maxOrderAll){dbData.order.all = dbData.order.all.slice(0, maxOrderAll)}
  module.exports.dbRef.order.update({all: dbData.order.all});
  console.log(`--新規発注情報 all更新完了`)
  
  //firestore更新
  const maxOrderUser = 30 //最大30件
  if(dbData.order[userId].length > maxOrderUser){dbData.order[userId] = dbData.order[userId].slice(0, maxOrderUser)}
  module.exports.dbRef.order.update({[userId]: newOrderRecord});
  console.log(`--新規発注情報 user更新完了`)
  return
}

//DB読み込み get()
const getDocFmDB = async (docRef, retryTime = 1) => {
  const key = "firestore getアクセス"
  await lock.acquire(key, async () => {
    console.log(`${key} ${retryTime}回目`)
    try {
      const doc = await docRef.get()
      if (doc.exists) {        
        return await doc.data();
      }
      throw new Error("No such document!");
    } catch (err) {
      logger.warn(`${key} ${retryTime}回目 エラー`)
      if (retryTime == max_retryTime) throw err;  //再試行終了

      //再試行
      await new Promise(resolve => setTimeout(resolve, retryDelayTime)); //待機
      return await getDocFmDB(docRef, retryTime + 1);
    }
  })
}

//書き込みと読み込みを同時にさせないためのメソッド
module.exports.accessFirestore = async (state, snapshot, plSheets, userId, orderArrays, retryTime = 1) =>{
  const key = "firestore snapshotアクセス"
  try{    
    return await lock.acquire(key, async () => {
      console.log(`${key} ${state} ${retryTime}回目`)

      if(state == "snapshotUpdate"){
        console.log(`-${state} ${snapshot.id}`);
        
        dbData[snapshot.id] = await snapshot.data();
      }
      else if(state == "getDB"){
        if(dbData.user_buyer == {}){
          dbData.user_buyer = await getDocFmDB(module.exports.dbRef.user_buyer)
        }
        return dbData
      }
      else if(state == "setNewStock"){
        await setNewStockTofirestore(plSheets)  //firestore 現在庫更新
      }
      else if(state == "insertOrder"){
        await setNewOrderTofirestore(userId, orderArrays) //firestore 発注情報更新
      }
      return
    })
  } catch (err) {
    logger.warn(`${key} ${state} ${retryTime}回目 エラー`)    
    
    if (retryTime == max_retryTime) throw err;  //再試行終了

    //再試行
    await new Promise(resolve => setTimeout(resolve, retryDelayTime)); //待機
    return await module.exports.accessFirestore(state, snapshot, plSheets, userId, orderArrays, retryTime + 1);
  }
}

//商品リスト 一覧取得
module.exports.getUpStateAllList = async (TIMESTAMP_NEW, lineNum) => {
  /*
  //2行まとめて表示  
  const messagesArray_text = await dbData.ProductsInfo["upStateList1"].replace(/timeStampNew/g, TIMESTAMP_NEW)  //timeStampを入力
  const messagesArray = JSON.parse(messagesArray_text)  
  */
  const dbData_cash = await module.exports.accessFirestore("getDB")

  ///*
  //1行ずつ表示
  let messagesArray_text
  if(lineNum){
    messagesArray_text = dbData_cash.ProductsInfo["upStateList1"].replace(/timeStampNew/g, TIMESTAMP_NEW)  //timeStampを入力
  }
  else{
    if(dbData_cash.ProductsInfo["upStateList2"] !== null){
      messagesArray_text = dbData_cash.ProductsInfo["upStateList2"].replace(/timeStampNew/g, TIMESTAMP_NEW)  //timeStampを入力
    }
    else{
      messagesArray_text = []
    }
  }
  const messagesArray = JSON.parse(messagesArray_text) //JSON形式に変換
  //*/
  
  return messagesArray
}
