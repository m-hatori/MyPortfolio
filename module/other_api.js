/* eslint-disable one-var */
//認証情報 fireStore、スプレッドシート、Driveへアクセスする際に必要。
//const ServiceAccount = require("../../linebot-for-buyer-3c96daa62b24.json"); 
const firebaseServiceAccount = require("../../linebot-for-buyer_firebase_ServiceAccount.json"); 
const googleDriveServiceAccount = require("../../linebot-for-buyer-spreadsheet_ServiceAccount.json"); 
//コレクション取得時 初期化
const admin = require("firebase-admin");
admin.initializeApp({credential: admin.credential.cert(firebaseServiceAccount)});
const db = admin.firestore();
const docCol = db.collection("LINEBot");

//読み込み
async function getDocFmDB(docName){
  const doc = await docCol.doc(docName).get();
  if (!doc.exists) {console.error("No such document!");}
  else {return doc}
}

//ユーザー情報 初期化
async function setUserInfo(docName, user){
  const data = {
    [user.ID]: {
      ID_HASH: "VTg4OTg5OTIyMjc0YjMyZDc2MzBkOGYwMDcwNTE1ZDNjMmM3NGEwY2ItMjdkNS00NWU2LWIxOTMtMTE1MDRmZGRlMDQ5",
      LINE_NAME: "鴻巣花き営業2課iPad",
      MARKET_ID_HASH: "NDk0MDFhMjhkNTQ0Zi0wZDIxLTRhZWUtYTk2Yy01MjkyNjc2NWZlN2Y=",
      BUYER_NAME: "鴻巣花き（自社使用分）",
      STATE: "",
      CART: []
    }
  }
  console.log(data)
  return docCol.doc(docName).set(data)
}

class FireStore_UserInfo{
  constructor(){
    this.docCol = docCol
    this.user_buyer
    this.doc
    this.docData
  }

  //読み込み
  async getDocFmDB(){
    this.user_buyer = this.docCol.doc("user_buyer")
    this.doc = await this.user_buyer.get();    
    if (!this.doc.exists) {console.log("No such document!");}
    else {
      this.docData = this.doc.data()
      return this.docData
    }
  }
}

//●●●スプレッドシート●●●
//スプレッドシート取得時 初期化
async function initializeDoc(spSheetId){
  const {GoogleSpreadsheet} = require("google-spreadsheet");
  const doc = new GoogleSpreadsheet(spSheetId);
  await doc.useServiceAccountAuth(googleDriveServiceAccount);
  await doc.loadInfo(); 
  //console.log("スプレッドシート「" + doc.title + "」取得");
  return doc
  //const sheet = doc.sheetsByIndex[0];
  //const sheet = doc.sheetsByTitle["シート1"]
  //const sheet = doc.sheetsById[id]
}

module.exports = {
  getDocFmDB,
  setUserInfo,
  FireStore_UserInfo,
  initializeDoc
}