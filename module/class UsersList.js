//12/20 一通り書き換え完了
//買い物かご情報をfireStoreに読み書きする部分
//cryptまわり 要修正
//とりあえず
//raw_userId → 暗号化 → スプレッドシート ユーザーリストと照合 でなく
//raw_userId → スプレッドシート ユーザーリストと照合 とする

/* eslint-disable semi-spacing */
/* eslint-disable one-var */
const property = require("./property.js");
const FireStore_API = require("./npm API/FireStore_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");


//●オブジェクト：DBレベル//
class User{
  constructor(){
    this.SECRETS

    //インスタンス
    this.httpsRequest = "" //https
    this.DB_User_Buyer_REF
    this.DB_User_Buyer_docData
        
    //Key
    this.ID = null
    
    //property
    this.property= null
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

  //DB ユーザー情報読み込み
  async getBuyerPropertyFmDB(){
    if(this.DB_User_Buyer_Property !== undefined){return}//既に情報がある場合、再度取得不要
    const DB_User_Buyer  = await FireStore_API.getDocFmDB("user_buyer")
    this.DB_User_Buyer_REF = DB_User_Buyer[0]
    this.DB_User_Buyer_docData = DB_User_Buyer[1]
    //console.log(`DB_user_buyer: ${this.DB_User_Buyer_docData}`)
  }

  //TODO: ユーザーが増え速度が遅くなったとき対処
  //浅いデータ構造を作るには以下のようにしたい
  //DBを読みに行く回数が増えてしまうので、クエリインデックスを作成したい
  //DB 単品発注内容 読み込み
  /*
  async getInstantOrderInfoPropertyFmDB(){
    if(this.DB_User_Buyer_Property !== undefined){return}//既に情報がある場合、再度取得不要
    const DB_InstantOrderInfo  = await FireStore_API.getDocFmDB("instantOrder")
    this.DB_InstantOrderInfo_REF = DB_InstantOrderInfo[0]
    this.DB_InstantOrderInfo_docData = DB_InstantOrderInfo[1]
    //console.log(`DB_user_buyer: ${this.DB_User_Buyer_docData}`)
  }  
  //DB 買い物かご 読み込み
  async getCartInfoPropertyFmDB(){
    if(this.DB_CartInfo_Property !== undefined){return}//既に情報がある場合、再度取得不要
    const DB_CartInfo  = await FireStore_API.getDocFmDB("cart")
    this.DB_CartInfo_REF = DB_CartInfo[0]
    this.DB_CartInfo_docData = DB_CartInfo[1]
    //console.log(`DB_user_buyer: ${this.DB_User_Buyer_docData}`)
  }
  */

  //ユーザー認証 属性取得
  async authUser(){
    //全ユーザー情報取得
    await this.getBuyerPropertyFmDB()

    //当ユーザー情報取得
    if(this.ID === undefined){
      throw new Error("ID_UNDEFINED")
    }
    this.property = this.DB_User_Buyer_docData[this.ID]  
    //console.log(`DB_user_buyer: ${this.property}`)  
    return
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
    return await this.DB_User_Buyer_REF.update({
      [this.ID]: this.property
    })
  }
  //単品発注内容 更新
  update_instantOrderInfo(){

  }

  //買い物かご情報 更新
  update_CartInfo(){
    // {[this.ID + ".CART"]: [this.property.CART]}  //キーに変数名を入れたい場合、[]で囲う！
    this.DB_User_Buyer_REF.update({
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
  let textMessage = LINE_NAME + "様\n\n" +
    "鴻巣花きLINE公式アカウントのご利用ありがとうございます。\n" +
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

  return [message_JSON.getTextMessage(textMessage), new StampMessage().よろしくお願いします]
}