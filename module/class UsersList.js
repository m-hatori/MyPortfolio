//12/20 一通り書き換え完了
//買い物かご情報をfireStoreに読み書きする部分
//cryptまわり 要修正
//とりあえず
//raw_userId → 暗号化 → スプレッドシート ユーザーリストと照合 でなく
//raw_userId → スプレッドシート ユーザーリストと照合 とする

/* eslint-disable semi-spacing */
/* eslint-disable one-var */
const property = require("./property.js");
const Firestore_API = require("./npm API/FireStore_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");


//●オブジェクト：DBレベル//
class User{
  constructor(){
    this.SECRETS

    //インスタンス
    this.httpsRequest = "" //https
        
    //userInfo
    this.ID
    this.property
    /*
    LINE_NAME: LINE_NAME,  
    STATE: STATE,
    LOGIN_FAILURE: LOGIN_FAILURE,
    MARKET_ID: MARKET_ID,
    BRANCH_NUM: BRANCH_NUM,
    BUYER_NAME: BUYER_NAME,
    CART:[],
    */
  }
 
  //ユーザー情報取得 属性取得
  async authUser(){
    if(this.ID === undefined){
      throw new Error("ID_UNDEFINED_FROM_LINE")
    }
    else if(Firestore_API.dbData.user_buyer === null || Firestore_API.dbData.user_buyer === undefined ){
      Firestore_API.dbData.user_buyer = await Firestore_API.getDocFmDB(Firestore_API.dbRef.user_buyer)      
    }

    if(Firestore_API.dbData.user_buyer[this.ID] !== null ){
      this.property = Firestore_API.dbData.user_buyer[this.ID]
    }else{
      throw new Error("ID_UNDEFINED_IN_DB")
    }
  }

  //フォロー時処理
  async follow(){
    if(this.property === undefined){
      this.DB_User_Buyer_REF.update({
        [this.ID]: {
          STATE: "友達追加",
          LINE_NAME: "",
          MARKET_ID: 0,
          BRANCH_NUM: 0,
          BUYER_NAME: "",
        }      
      })      
    }
    else{
      this.property.STATE = "ブロック解除"
      this.DB_User_Buyer_REF.update({
        [this.ID]: this.property  
      })
    }

    //リッチメニューをリセット 保険
    this.httpsRequest.resetRichMenu(this.ID)

    return getAfterFollowMessage(this.property.LINE_NAME)
  }

  //ブロック時処理
  async unfollow(){
    //リッチメニューをリセット
    this.httpsRequest.resetRichMenu(this.ID)

    //DB書き換え
    this.property.STATE = "ブロック"
    this.property.CART = []
    this.DB_User_Buyer_REF.update({
      [this.ID]: this.property
    })
    return
  }

  //ユーザー情報 更新
  async updateDB(){
    // {[this.ID + ".CART"]: [this.property.CART]}  //キーに変数名を入れたい場合、[]で囲う！
    await Firestore_API.dbRef.user_buyer.update({
      [this.ID]: this.property
    });
    this.setRichMenu()
  }
  
  //リッチメニュー切り替え
  setRichMenu(){
    this.httpsRequest.setRichMenu(this.ID, property.cartNum[this.property.CART.length])
  }
}
module.exports = User


//友達追加直後 ユーザーリストにないユーザーへの処理 
const getAfterFollowMessage = (LINE_NAME) => {
  //●メッセージ作成
  let textMessage = "鴻巣花きLINE公式アカウントのご利用ありがとうございます。\n" +
  "当公式アカウントでは、希少・少量で完売スピードの速い商品や、注文のみ対応の商品などを中心に、随時ご案内いたします。\n\n" +

  "当公式アカウントのご利用は、鴻巣花き株式会社と売買取引基本契約を結んでいる買参人様に限らせていただきます。\n" +
  "以下のURLより、「鴻巣花き公式アカウント サービス利用規約」を一読、同意ください。\n" +
  "https://drive.google.com/file/d/1Wm1V8gTfu4tOilCeeub7ubmFkD56ZUrI/view?usp=sharing\n\n" +

  "その後、画面下部のメニュー「利用規約に同意してログイン」ボタンを押していただき、買参人サイト同様、本人認証をお願い致します。\n" +
  "なお本人認証が完了した時点で、利用規約に同意いただいたものとみなします。\n\n" +

  "～認証完了後～\n" +
  "画面下部の、「メインメニュー」が変更されますので、そちらから操作願います。\n" +
  "操作方法は、「メニュー」をタップいただき、「マニュアル」をご覧ください。 \n" +
  "不正利用が発覚した場合、しかるべき処置をとらせていただきます。予めご了承くださいませ。"

  if(LINE_NAME != ""){
    textMessage = LINE_NAME + "様\n\n" + textMessage
  }
  return [message_JSON.getTextMessage(textMessage), new StampMessage().よろしくお願いします]
}