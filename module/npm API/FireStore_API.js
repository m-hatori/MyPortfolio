/* eslint-disable one-var */
//認証情報 fireStore、スプレッドシート、Driveへアクセスする際に必要。
//const ServiceAccount = require("../../linebot-for-buyer-3c96daa62b24.json"); 
const firebaseServiceAccount = require("../../../linebot-for-buyer_firebase_ServiceAccount.json"); 

//コレクション取得時 初期化
const admin = require("firebase-admin");
admin.initializeApp({credential: admin.credential.cert(firebaseServiceAccount)});
const db = admin.firestore();
const docCol = db.collection("LINEBot");

//読み込み
async function getDocFmDB(docName){
  const docRef = await docCol.doc(docName)
  
  const getOptions = {
    source: 'cache'
  };

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

module.exports = {
  getDocFmDB
}