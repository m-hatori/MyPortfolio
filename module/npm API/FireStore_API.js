/* eslint-disable node/no-missing-require */
/* eslint-disable one-var */
//独自のサーバーで初期化
const SECRET = require("./secret.js");
const admin = require("firebase-admin");

//読み込み
module.exports.getDocFmDB = async (docName) => {
  const jsonfile = JSON.parse(await SECRET.fb_serviceAccount())
  if (admin.apps.length === 0) {
    admin.initializeApp({credential: admin.credential.cert(jsonfile)});
  }
  const db =  admin.firestore();
  const docCol = db.collection("LINEBot");
  const docRef = await docCol.doc(docName)

  /*
  //TODO: スキップ 必ず元のデータを確認させる？ → 現状不要。今後商品情報、発注情報をfirestoreに実装する場合は必要。
  const getOptions = {
    source: 'cache'
  };
  */

  //return docRef.get(getOptions).then((doc) => {
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