/* eslint-disable node/no-missing-require */
/* eslint-disable one-var */
//const SpreadSheet_API = require("./SpreadSheet_API.js");

//Cloud Functionsで初期化
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
initializeApp();
const db = getFirestore();

// リファレンス
const dbCollection = db.collection("LINEBot")
module.exports.dbRef = {
  ProductsInfo: dbCollection.doc("ProductsInfo"),
  plSheet: dbCollection.doc("plSheet"),
  user_buyer: dbCollection.doc("user_buyer"),
  //order: dbCollection.doc("order"),
}

// データ instance
module.exports.dbData = {
  ProductsInfo: {},
  plSheet: {},
  user_buyer: {},
  //order: {},
}

// DB変更後の処理
const handleFirestoreSnapshot = (snapshot) => { 
  console.log(`firestore update: ${snapshot.id}`);
  module.exports.dbData[snapshot.id] = snapshot.data();
};

// クライアントサイドからのDB変更リスナー
module.exports.dbRef.ProductsInfo.onSnapshot((snapshot) => {handleFirestoreSnapshot(snapshot)});
module.exports.dbRef.plSheet.onSnapshot((snapshot) => {handleFirestoreSnapshot(snapshot)});
module.exports.dbRef.user_buyer.onSnapshot((snapshot) => {handleFirestoreSnapshot(snapshot)});

/*
module.exports.dbRef.order.onSnapshot((snapshot) => {
  handleFirestoreSnapshot(snapshot)
  SpreadSheet_API.insertOrderRecord()
});
*/

//サーバーサイドからのDB変更リスナー
/*
module.exports.serverObserver = functions.firestore
.document('{colName}/{docName}')
.onUpdate((change, context) => {
  const colName = context.params.colName; // コレクション名
  const docName = context.params.docName; // ドキュメント名    
  console.log(`firestore update from serverSide: ${colName}/${docName}`)

  const updatedData = change.after.data();
  module.exports.dbData[docName] = updatedData  
  return null;
});
*/

//DB読み込み get()
module.exports.getDocFmDB = async (docRef) => {
  try {
    const doc = await docRef.get()
    if (doc.exists) {
      const docData = doc.data();
      return docData;
    }
    throw new Error("No such document!");
  } catch (error) {
    console.log(error);
    return [];
  }
}
/*
//独自のサーバーで初期化
const SECRET = require("./secret.js");
const admin = require("firebase-admin");

//初期化
const getAdmin = async () => {
  if (!admin.apps.length) {
    const jsonfile = JSON.parse(await SECRET.fb_serviceAccount())
    admin.initializeApp({ credential: admin.credential.cert(jsonfile) });
  }
}
getAdmin()
const db = admin.firestore()

//読み込み
module.exports.getDocFmDB = async (docName) => {
  try {
    const adminInstance = await getAdmin();
    const docRef = await adminInstance.collection("LINEBot").doc(docName).get();
    if (docRef.exists) {
      const docData = docRef.data();
      return [docRef, docData];
    }
    throw new Error("No such document!");
  } catch (error) {
    console.log(error);
    return [];
  }
}
*/

//商品リスト 一覧取得
module.exports.getUpStateAllList = async (TIMESTAMP_NEW, lineNum) => {
  /*
  //2行まとめて表示  
  const messagesArray_text = await module.exports.dbData.ProductsInfo["upStateList1"].replace(/timeStampNew/g, TIMESTAMP_NEW)  //timeStampを入力
  const messagesArray = JSON.parse(messagesArray_text)  
  */

  ///*
  //1行ずつ表示
  let messagesArray_text
  if(lineNum){
    messagesArray_text = module.exports.dbData.ProductsInfo["upStateList1"].replace(/timeStampNew/g, TIMESTAMP_NEW)  //timeStampを入力
  }
  else{
    if(module.exports.dbData.ProductsInfo["upStateList2"] !== null){
      messagesArray_text = module.exports.dbData.ProductsInfo["upStateList2"].replace(/timeStampNew/g, TIMESTAMP_NEW)  //timeStampを入力
    }
    else{
      messagesArray_text = []
    }    
  }
  const messagesArray = JSON.parse(messagesArray_text) //JSON形式に変換
  //*/
  return messagesArray  
}