/* eslint-disable one-var */
//const {admin} = require("./Firebase.js");
const firebaseServiceAccount = require("../../../linebot-for-buyer_firebase_ServiceAccount.json"); 

//コレクション取得時 初期化
const admin = require("firebase-admin");
admin.initializeApp({credential: admin.credential.cert(firebaseServiceAccount)});

//読み込み
module.exports.getDocFmDB = async (docName) => {
  const db = admin.firestore();
  const docCol = db.collection("LINEBot");
  const docRef = await docCol.doc(docName)
  
  /*
  //TODO: スキップ 必ず元のデータを確認させる？ → 現状不要。今後商品情報、発注情報をfirestoreに実装する場合は必要。
  const getOptions = {
    source: 'cache'
  };
  */

  //docRef.get(getOptions).then((doc) => {
  return docRef.get().then((doc) => {    
    if (doc.exists) {
      const docData = doc.data()
      return [docRef, docData]
    }else {
      throw new Error("No such document!")
    }
    }).catch((error) => {
      console.log(error);
    }); 
}
/*
(async function(){
  console.log(await module.exports.getDocFmDB("secret"))
}())
*/