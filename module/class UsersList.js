/* eslint-disable semi-spacing */
/* eslint-disable one-var */
const functions = require('firebase-functions');
const logger = functions.logger

const Firestore_API = require("./npm API/FireStore_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");

const richMenu = require("./richMenu_official.js");
//const richMenu = require("./richMenu_test.js");

//●オブジェクト：DBレベル//
class User{
  constructor(ID, property){
    //userInfo
    this.ID = ID
    this.property = property

    /*
    property = {
      LINE_NAME: LINE_NAME,  
      STATE: STATE,
      LOGIN_FAILURE: LOGIN_FAILURE,
      MARKET_ID: MARKET_ID,
      BRANCH_NUM: BRANCH_NUM,
      BUYER_NAME: BUYER_NAME,
      CART:[],
    }
    */

    this.loginState = {
      login: "ログイン",
      loginfailure: "ログイン失敗",
      newfollow: "友達追加",
      refollow: "ブロック解除",
      block: "ブロック"
    }
    this.httpsRequest
  }

  //ユーザー認証
  async auth(eventType){
    //ID確認
    if(this.ID === undefined || this.ID === null || this.ID == "") throw new Error("ID_UNDEFINED_FROM_LINE")

    //firestoreにユーザー情報なし
    if(this.property === undefined || this.property === null){
      
      //新規友達登録
      if(eventType == "follow"){
        //初期化
        this.property = {
          STATE: this.loginState.newfollow,
          LINE_NAME: "",
          MARKET_ID: 0,
          BRANCH_NUM: 0,
          BUYER_NAME: "",
          CART: [],
          LOGIN_FAILURE: 0
        }
        this.property.LINE_NAME = await this.getLineUserName()

        logger.warn(`${STATE} | ${this.property.LINE_NAME}`)
                
        //DB書き換え
        await this.updateFirestore()

        //リッチメニューをリセット 保険
        this.resetRichMenu()
      }
      else{
        throw new Error(`firebase ユーザー情報 取得エラー`)
      }      
    }

    //firestoreにユーザー情報あり
    else{
      console.log(`${STATE} | ${this.property.LINE_NAME} | ${this.property.MARKET_ID} - ${this.property.BRANCH_NUM} ${this.property.BUYER_NAME}`)      

      //ブロック解除
      if(eventType == "follow"){
        
        //初期化
        this.property.LINE_NAME = await this.getLineUserName()
        this.property.STATE = this.loginState.refollow
        this.property.CART = []

        logger.warn(`${STATE} | ${this.property.LINE_NAME} | ${this.property.MARKET_ID} - ${this.property.BRANCH_NUM} ${this.property.BUYER_NAME}`)

        //DB書き換え
        await this.updateFirestore()

        //リッチメニューをリセット
        this.resetRichMenu()
      }
    }
  }

  //フォローメッセージ 取得
  async getfollowMessage(){

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

    if(this.property.LINE_NAME != "" && this.property.LINE_NAME !== undefined && this.property.LINE_NAME !== null){
      textMessage = LINE_NAME + "様\n\n" + textMessage
    }

    let messagesArray = [message_JSON.getTextMessage(textMessage), new StampMessage().よろしくお願いします]
    return messagesArray
  }

  //ブロック時処理
  async unfollow(){
    this.property.STATE = this.loginState.block
    //if(this.property.LINE_NAME != ""){this.property.LINE_NAME = await this.getLineUserName()}  ブロック時実施不可
    this.property.CART = []

    logger.warn(`${STATE} | ${this.property.LINE_NAME} | ${this.property.MARKET_ID} - ${this.property.BRANCH_NUM} ${this.property.BUYER_NAME}`)
  
    //DB書き換え
    await this.updateFirestore()

    //リッチメニューをリセット
    //this.resetRichMenu()  ブロック時実施不可
  }

  //ユーザー情報 更新
  async updateDB(){
    this.updateFirestore()  //firestore ユーザー情報更新
    this.setRichMenu()  //リッチメニュー更新
    return
  }

  //firestore ユーザー情報更新
  async updateFirestore(){
    // {[this.ID + ".CART"]: [this.property.CART]}  //キーに変数名を入れたい場合、[]で囲う
    await Firestore_API.dbRef.user_buyer.update({
      [this.ID]: this.property
    });
    return
  }

  //ユーザーリッチメニュー設定
  setRichMenu() {
    const URL = `https://api.line.me/v2/bot/user/${this.ID}/richmenu/${richMenu.Ids[this.property.CART.length]}`
    //const URL = `https://api.line.me/v2/bot/user/${this.ID}/richmenu/${richMenu.Ids[2]}`
    return this.httpsRequest.request("リッチメニュー更新", "post", URL)
  }

  //ユーザーリッチメニュー解除
  resetRichMenu() {
    const URL = `https://api.line.me/v2/bot/user/${this.ID}/richmenu`
    return this.httpsRequest.request("リッチメニュー初期化", "delete", URL)
  }

  //●LINEプロフィールプロフィール取得
  async getUserProfile(){ 
    const URL = `https://api.line.me/v2/bot/profile/${this.ID}`
    return await this.httpsRequest.request("LINEプロフィールプロフィール取得", "get", URL)
  }

  //LINE名取得
  async getLineUserName(){
    const res = await this.getUserProfile()
    return res.data.displayName;
  }
}
module.exports = User