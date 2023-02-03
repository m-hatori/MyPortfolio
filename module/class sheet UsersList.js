//12/20 一通り書き換え完了
//買い物かご情報をfireStoreに読み書きする部分
//cryptまわり 要修正
//とりあえず
//raw_userId → 暗号化 → スプレッドシート ユーザーリストと照合 でなく
//raw_userId → スプレッドシート ユーザーリストと照合 とする

/* eslint-disable semi-spacing */
/* eslint-disable one-var */
//const postCode_JSON = require("./postCode_JSON.js");
const property = require("./property.js");
const other_api = require("./other_api.js");

//const property = require("./property.js");
//const postCode_JSON = require("./postCode_JSON.js");

const message_JSON = require("./message_JSON.js");

//const message_JSON = require("./message_JSON.js");
//const message_JSON_irregular = require("./message_JSON_irregular.js");
//const message_JSON_Cart = require("./message_JSON_Cart.js")
const FireStore_UserInfo = other_api.FireStore_UserInfo
const StampMessage = require("./class Stamp.js");


//●オブジェクト：シートレベル//
class Users{
  constructor(){

    this.SSIDS
    
    /*
    this.SSID
    this.document = null
    this.sheet = null

    //シートID
    this.sheetIds = {
      "allUser" : 258451556,     
      "buyer" : 762571707,
    };

    //属性と列番号
    //this.columns = {"id":0, "lineName":1, "userClass":2, "marketId":3, "name":4, "loginFailure":5}
    this.columns = {"id_hash":0, "LINE_Name":1, "market_id_hash":2, "buyer_Name":3, "state":4}
    
    //列数
    this.colNum = 6

    //ユーザーの分類
    this.userClasses ={"common":"一般","buyer":"買参人","producer":"出荷者","admin":"管理者"}

    //データ範囲
    this.headersRow = 0,  //0行目
    this.sRow = 0
    this.eRow
    this.sColumn = 0
    this.eColumn = 5

    //行数
    this.rowNum// = this.eRow - this.sRow + 1
    //if(this.rowNum < 1){this.rowNum = 1}
    
    //crypt
    this.cryptPettern = {lineId:0, marketId:1}
    this.pepper
    this.strech
    this.allUserInfo
    */

    //インスタンス
    this.httpsRequest = "" //https
    this.DB_User_Buyer_Property //DB    
  }
  /*
  //スプレッドシート取得 汎用メソッドにするか
  async getSheet(SSID){return await other_api.initializeDoc(SSID)}
    
  //全 ユーザー情報を取得 戻り値：配列   汎用メソッドにするか
  async getAllSheetData(SSID) {
    if(this.document === null){
      this.document = await this.getSheet(SSID)
    }
    
    this.sheet = await this.document.sheetsById[this.sheetIds.buyer]
    
    //全範囲取得
    this.allUserInfo = await this.sheet.getRows()
    this.rowNum = this.allUserInfo.length
    this.eRow = this.rowNum - this.sRow + 1 //タイトル行を加える
  }
  */

  //DB読み込み
  async getBuyerPropertyFmDB(){
    if(this.DB_User_Buyer_Property !== undefined){return}//既に情報がある場合、再度取得不要
    this.DB_User_Buyer_Property = new FireStore_UserInfo()
    await this.DB_User_Buyer_Property.getDocFmDB()
  }
}

//●オブジェクト：rowレベル//
//基本的に情報の読み込みのみ
class User extends Users {
  constructor(){
    super();
    
    //Key
    this.ID = null

    //property
    this.property= null
    /*
      MARKET_ID: MARKET_ID,
      BRANCH_NUM: BRANCH_NUM,
      BUYER_NAME: BUYER_NAME,
      CART:[],
      LINE_NAME: LINE_NAME,        
      STATE: STATE,
      LOGIN_FAILURE: LOGIN_FAILURE    
    */

    this.CARTINFOARRAY_INDEX
    
    //TODO: ???
    this.allsD = ""
    this.alleD = ""
  }

  //ユーザー認証 属性取得 スプレッドシート
  /*
  async authUser(ID){
    this.ID = ID

    //user情報全取得
    await super.getAllSheetData(this.SSIDS.spSheetId2)

    //ID照合
    let userInfo = []
    for(let i = 0; i < this.allUserInfo.length; i++){
      if(this.ID == this.allUserInfo[i].id_hash){
        userInfo.push([i, this.allUserInfo[i]])
      }
    }

    //照合判定
    const userNum = userInfo.length
    //console.log(`userNum : ${userNum}`)
    //OK 属性取得
    if(userNum == 1){
      this.INFO = userInfo[0][1]
      console.log(`LINE Name : ${this.INFO.LINE_Name}`)

      //買い物かご情報    
    }
    //IDが複数リストにあるとき
    else if(userNum > 1){
      for(let i in userInfo){
        console.log(`row : ${userInfo[i][0] + 2}`)
      }
      throw new Error("同一のユーザーが複数います")
    }
    //IDがリストにないとき
    else if(userNum == 0){
      throw new Error("リストにないユーザーからのアクセスです。")
    }
  }
  */

  async getSSIDS(){
    const SPREADSHEETIDS_DOC = await other_api.getDocFmDB("spreadSheet")
    this.SSIDS = SPREADSHEETIDS_DOC.data()
    return
  } 

  //ユーザー認証 属性取得
  async authUser(){
    await this.getBuyerPropertyFmDB()

    //本ユーザーの買い物かご情報取得
    if(this.ID === undefined){
      throw new Error("ID_UNDEFINED")
    }
    this.property= this.DB_User_Buyer_Property.docData[this.ID]
    //console.log(this.property)
    return
  }

  //買い物かご情報 更新
  async update_CartInfo(){
    // {[this.ID + ".CART"]: [this.property.CART]}  //キーに変数名を入れたい場合、[]で囲う！
    this.DB_User_Buyer_Property.user_buyer.update({
      [this.ID]: {
        CART: this.property.CART
      }
    });
    this.setRichMenu()
  }

  async update_LINE_NAME(){
    // {[this.ID + ".CART"]: [this.property.CART]}  //キーに変数名を入れたい場合、[]で囲う！
    this.DB_User_Buyer_Property.user_buyer.update({
      [this.ID]: {
        LINE_NAME: this.property.LINE_NAME
      }
    });
  }
  
  //リッチメニュー切り替え
  setRichMenu(){
    this.httpsRequest.setRichMenu(this.ID, property.cartNum[this.property.CART.length])
  }  
  
  //フォロー時処理
  async follow(){
    this.property.LINE_NAME = await this.httpsRequest.getLineUserName(this.ID)  //LINE名取得
    this.DB_User_Buyer_Property.user_buyer.update({
      [this.ID]: {
        MARKET_ID: 0,
        BRANCH_NUM: 0,
        BUYER_NAME: "",
        LINE_NAME: this.property.LINE_NAME,
        LOGIN_FAILURE: 0,
        CART: [],
        STATE: "ブロック解除",
      }      
    })    
    return getAfterFollowMessage(this.property.LINE_NAME)
  }

  //ブロック時処理
  async unfollow(){
    //リッチメニューをリセット
    this.httpsRequest.resetRichMenu(this.ID)

    //DB書き換え
    //this.property.LINE_NAME = await this.httpsRequest.getLineUserName(this.ID)  //ブロック後はLINE名取得できない？
    return await this.DB_User_Buyer_Property.user_buyer.update({
      [this.ID]: {
        MARKET_ID: 0,
        BRANCH_NUM: 0,
        BUYER_NAME: "",
        LOGIN_FAILURE: 0,
        CART: [],
        LINE_NAME: this.property.LINE_NAME,
        STATE: "ブロック",
      }      
    })
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


  //TODO: 挨拶文にどんな商品を どのくらいの頻度でお知らせするのか追記する？

  return [message_JSON.getTextMessage(textMessage), new StampMessage().よろしくお願いします]
}