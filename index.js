/* eslint-disable no-invalid-this */
/* eslint-disable one-var */
//Doing
//課題
//買い物かごまわり
//
//console.log("debug clear")
const functions = require("firebase-functions")
const axios = require("axios");

const postCode_JSON = require("./module/postCode_JSON.js");
const other_api = require("./module/other_api.js");

require("date-utils");

const message_JSON = require("./module/message_JSON.js");

const Products = require("./module/class sheet ProductsList.js");
const User = require("./module/class sheet UsersList.js");

const branch = require("./module/branch_process.js");
//const line = require('@line/bot-sdk');


//test用
const property = require("./module/property.js");

const timeMethod = require("./module/getTime.js");
const message_JSON_irregular = require("./module/message_JSON_irregular.js");
const message_JSON_Order = require("./module/message_JSON_Order.js");
const message_JSON_Cart = require("./module/message_JSON_Cart.js")

const OrderRecords = require("./module/class sheet OrdersList.js");
const FireStore_UserInfo = other_api.FireStore_UserInfo


//●テキストメッセージ処理分岐
async function branchOfTextMessage(TIMESTAMP_NEW, textMessage, user){  
  let messagesArray = []
  if(textMessage == "商品情報リスト表示"){
    const products = new Products(user.SSIDS.spSheetId1)
    messagesArray = await products.getUpStateAllList(1, 1, TIMESTAMP_NEW)  //買参人用、掲載中, タイムスタンプ
    if(messagesArray.length > 0){
      messagesArray.push(message_JSON.getTextMessage("商品リストを上に表示しました。\n「詳細」ボタンを押すと、掲載中の商品をご確認いただけます。"))
    }
  }
  else if(textMessage == "買い物かご確認"){

    //買い物かご内情報確認
    const STATE_CART = await user.getCartInfoFmFirestore()
    if(STATE_CART[0]){return STATE_CART[1]}
    //STATE_NEWORDER 新規発注確認: true
    //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
    messagesArray = await message_JSON_Cart.getProductsInCart(user, TIMESTAMP_NEW, true, 2)

    //買い物かご内情報有無確認
    if(STATE_CART[1] > 0){
      //買い物かご内情報有
      const textMessage = "買い物かご情報を上に表示しました。\n" +
      "買い物かご追加直後の商品は、希望口数は1、希望市場納品日は最短納品可能日が指定されています。\n\n" +
      "「口数」、「納品日」ボタンを押すと、それぞれ変更できます。\n\n" +
      "「削除」ボタンを押すと、買い物かごから削除できます。\n\n" +
      "操作が反映されていないときは、再度買い物かごボタンを押してください。"
      messagesArray.push(message_JSON.getTextMessage(textMessage))
    }

    //リッチメニュー切り替え 保険
    user.setRichMenu()
  }
  else if(textMessage == "メニュー" || textMessage == "設定" ){
    //変数定義
    let columns1 = [], columns2 = []
    const checkOrder = postCode_JSON.postBackTag.menu + "-" + postCode_JSON.postBackNum.menu.checkOrder
    //const changeNumB = postCode_JSON.postBackTag.menu + "-"  + postCode_JSON.postBackNum.menu.changeNumB
    //const changeClass = postCode_JSON.postBackTag.menu + "-"  + postCode_JSON.postBackNum.menu.changeClass
    const FILES_DOC = await other_api.getDocFmDB("files")
    const FILES = FILES_DOC.data()

    //発注履歴 
    columns1.push(message_JSON.getMenubutton("発注履歴", checkOrder))
    
    //枝番号の変更
    //columns.push(getMenubutton("買参人コード枝番号の切替", changeNumB))

    //ユーザークラス切替
    //columns.push(getMenubutton("ユーザクラスの切替", changeClass))

    //TBD 近隣の出荷者情報の閲覧
    //columns.push(getMenubutton("", ))
    //console.log(FILES.manualForBuyer)
    //console.log(FILES.termsForBuyer)

    //マニュアル
    columns1.push(message_JSON.getMenubuttonURL("マニュアル", FILES.manualForBuyer, FILES.manualForBuyer))

    //利用規約
    columns1.push(message_JSON.getMenubuttonURL("利用規約", FILES.termsForBuyer, FILES.termsForBuyer))
    
    const card = message_JSON.getCarouselMenulMessageCard(columns1)
    columns2.push(card)

    messagesArray.push(message_JSON.getflexCarouselMessage("メニュー", columns2))
  }
  else{
    messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
  }
  return messagesArray
}

//const pepper = (async function(){return pepper}());
//const strech = (async function(){return strech}());

const console_Success = (response) =>{
  console.log(`res state: ${response.statusText} ${response.status}`);
  //console.log(response.headers);
  //console.log(response.data);
  //console.log(response.config);
}

const console_Error = (error) =>{
  if(error.response){
    console.log(`res state: ${error.statusText} ${error.status}`);
      console.error(`res header: ${error.response.headers}`);
      console.error(`res data: ${error.response.data}`);              
  }
  else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.error(error.request);
  } 
  else{
    console.error(error.message);
  }
  console.error(error.config);    
}
//TODO: 何を実行し、成功か失敗かわかるように
class HttpsRequest{
  constructor(){
    //LINEサーバー エンドポイントURL 一般後記されているのでセキュリティ保護の必要なし
    this.epUrls = {
      "reply"     :"https://api.line.me/v2/bot/message/reply",
      "push"      :"https://api.line.me/v2/bot/message/push",
      "multi"     :"https://api.line.me/v2/bot/message/multicast",
      "narrow"    :"https://api.line.me/v2/bot/message/narrowcast",
      "broadcast" :"https://api.line.me/v2/bot/message/broadcast",
      "profile"   :"https://api.line.me/v2/bot/profile/",
      "ids"       :"https://api.line.me/v2/bot/followers/ids"
    }

    this.ACCESSTOKEN
  }
 
  //POST Request
  async httpsRequestByAxios(URL, data){
    axios.defaults.headers.method = "POST"
    axios.defaults.headers.post['Content-Type'] = "application/json;";
    axios.defaults.headers.common["Authorization"] = "Bearer " + this.ACCESSTOKEN;

    //https Post Request
    return await axios.post(URL, data)
      .then((response) => {
        console_Success(response)
        return response
      })
      .catch((error) => {
        console_Error(error)
        return error
      });
  }

  //GET Requeset
  async httpsGETRequestByAxios(URL){
    axios.defaults.headers.method = "GET"
    axios.defaults.headers.common["Authorization"] = "Bearer " + this.ACCESSTOKEN;

    //https Post Request
    return await axios.get(URL)
      .then((response) => {
        console_Success(response)
        return response
      })
      .catch((error) => {
        console_Error(error)
        return error
      });
  }

  //DELETE Requeset
  async httpsDELETERequestByAxios(URL){
    axios.defaults.headers.method = "DELETE"
    axios.defaults.headers.common["Authorization"] = "Bearer " + this.ACCESSTOKEN;

    //https Post Request
    return await axios.delete(URL)
      .then((response) => {
        console_Success(response)
        return response
      })
      .catch((error) => {
        console_Error(error)
        return error
      });
  }

  //Reply
  async replyMessageByAxios(event, messagesArray){
      const data = JSON.stringify({
        replyToken: event.replyToken,
        messages: messagesArray
      });  
      
      //header info
      const url = this.epUrls.reply;
      
      return await this.httpsRequestByAxios(url, data)
  }
    
  //Push
  async pushMessageByAxios(userIds, messagesArray){
    const data = JSON.stringify({
        "notificationDisabled":false,//false：ユーザに通知する true：ユーザに通知しない
        "to": userIds,
        "messages": messagesArray
    });

    //header info
    const url = this.epUrls.push;

    return await this.httpsRequestByAxios(url, data)
  }

  //RichMenu
  //ユーザーリッチメニュー設定
  setRichMenu(userId, richMenuId) {
    const URL = "https://api.line.me/v2/bot/user/" + userId + "/richmenu/" + richMenuId
    return this.httpsRequestByAxios(URL)
  }

  //ユーザーリッチメニュー解除
  resetRichMenu(userId) {
    const URL = "https://api.line.me/v2/bot/user/" + userId + "/richmenu"
    return this.httpsDELETERequestByAxios(URL)
  }

  //●LINEプロフィールプロフィール取得
  getUserProfile(userId){ 
    let url = this.epUrls.profile + userId;
    return this.httpsGETRequestByAxios(url)
  }

  //LINE名取得 シートで管理せず毎回取得?
  async getLineUserName(userId){
    const res = await this.getUserProfile(userId)
    return res.data.displayName;
  }

  /*
  //ユーザーリッチメニュー取得
  async function getUserRichMenu(userId){
    const URL = "https://api.line.me/v2/bot/user/" + userId + "/richmenu";
    return await httpsGETRequestByAxios(URL)
  }
  */  
}

//署名検証
async function authSecretKey(SIGNATURE, BODY, CHANNELSECRET){
  const crypto = require('crypto');
  const SIGNATURE_DIGEST = crypto
    .createHmac("SHA256", CHANNELSECRET)
    .update(JSON.stringify(BODY))
    .digest("base64");
  //console.log(`SIGNATURE_DIGEST : ${SIGNATURE_DIGEST}`)
  
  if(SIGNATURE == SIGNATURE_DIGEST){
    return true
  }
  else{
    return false
  }
}

module.exports.helloWorld =  functions.region("asia-northeast1").https.onRequest(async (request) => {
  try{
    console.time('measurement of time')
    if (request.method == "POST"){
      //リクエスト 前処理
      const SECRET_DOC = await other_api.getDocFmDB("secret")
      const SECRET = SECRET_DOC.data()

      //署名確認
      const CHANNELSECRET = SECRET.CHANNELSECRET      
      const SIGNATURE = await authSecretKey(request.headers["x-line-signature"], request.body, CHANNELSECRET)
      
      //httpsRequest インスタンス にアクセストークン格納
      const httpsRequest = new HttpsRequest()
      httpsRequest.ACCESSTOKEN = SECRET.ACCESSTOKEN

      if(SIGNATURE){
        const HACKTEXT = /[&`$<>*?!(){};|]/g
        const events = request.body.events
        console.log(`events count: ${events.length}`)
        
        return Promise.all(events.map(async (event) => {
          //return events.map(async (event) => {
          //イベント情報の取得
          const eventType = event.type
          functions.logger.log(`eventType:${eventType}`)
          //const replyToken = event.replyToken
          const TIMESTAMP_NEW = event.timestamp
          functions.logger.log(`TIMESTAMP_NEW:${TIMESTAMP_NEW}`)
          //let deliveryday = event.postback.params.date  //yyyy-mm-dd

          //Userインスタンス作成     
          const user = new User()
          user.ID = event.source.userId
          user.ID = user.ID.replace(HACKTEXT, "")//ハッキング警戒文字列を削除;
          user.httpsRequest = httpsRequest

          let messagesArray = [];
          return Promise.all([user.authUser(), user.getSSIDS()])
            .then(async () => {
              if(eventType == "message"){
                //メッセージタイプ分岐
                const messageType = event.message.type
                functions.logger.log(`messageType:${messageType}`)
                if(messageType == "text"){
                    const textMessage = event.message.text.replace(HACKTEXT,"") //ハッキング警戒文字列を削除
                    functions.logger.log(`textMessage:${textMessage}`)

                    //文字数制限 ハッキング対策
                    if(textMessage.length > 50){
                      messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
                    }
                    else{
                      messagesArray = await branchOfTextMessage(TIMESTAMP_NEW, textMessage, user)
                    }
                }
                else{
                  messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
                }
              }
              else if(eventType == "postback"){
                const postBackData = event.postback.data.replace(HACKTEXT,""); //ハッキング警戒文字列を削除
                functions.logger.log(`postBackData : ${postBackData}`)
                messagesArray = await branch.postBack_process(event, TIMESTAMP_NEW, postBackData, user)
              }
              else if(eventType == "follow"){messagesArray = await user.follow()}
              else if(eventType == "unfollow"){return user.unfollow()}          
              else{
                messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
              }
              //返信
              //TODO: タイムアウトするまで継続してしまう。。。
              return httpsRequest.replyMessageByAxios(event, messagesArray)
            })
        }))
      }
      else{
        console.error(`signature Error`);
        return null
      }
    }
  }
  catch(e){
    functions.logger.error(e)
    return e
  }
  finally{
    console.timeEnd()
  }
});

/*
(async function(){
}())
*/


/*
//未確認 APIリクエストのリトライ処理
function requestRetry(res, epUrl, propUser, message, to, retryKey){

  let user = new User(to)

  const _stateCode = res.getResponseCode()
  console.log(`stateCode : ${_stateCode}`)

  let retryTimes = Number(propUser.getProperty(user.lineId_crypto + "_retryTimes"))
  console.log(`retryTimes : ${retryTimes}`)

  //stateCode:500  内部サーバーのエラー
  //リトライ回数 reTryTime:5回で終了する
  if(_stateCode == 500 && (retryTimes === null || retryTimes <= 5)){
    
    //リトライ回数の更新
    propUser.setProperty(user.lineId_crypto + "_retryTimes", retryTimes + 1)
    
    console.log(`stateCode : ${prop.getProperty("retryTimes")}`)

    sendMessage(epUrl, message, to, retryKey)
    return 500
  }
  else{
    propUser.setProperty(user.lineId_crypto + "_retryTimes", 0)
    return 200
  }
}
*/
/*
//TEST ALL
(async function(){
  console.time('measurement of time')
  //TEST用 定数
  const TIMESTAMP = new Date(2023, 0, 25, 15, 55, 29).getTime()

  //単品発注
  //const TAG_REF = postCode_JSON.postBackTag.instantOrder
  //const NUM_REF = postCode_JSON.postBackNum.instantOrder.setDeliveryday
  //const NUM_REF = postCode_JSON.postBackNum.instantOrder.orderConfirm
  //const NUM_REF = postCode_JSON.postBackNum.instantOrder.reOrderConfirm

  //複数発注発注
  const TAG_REF = postCode_JSON.postBackTag.cart
  //const NUM_REF = postCode_JSON.postBackNum.cart.add
  const NUM_REF = postCode_JSON.postBackNum.cart.check
  //const NUM_REF = postCode_JSON.postBackNum.cart.orderConfirm
  //const NUM_REF = postCode_JSON.postBackNum.cart.reOrderConfirm
  const POSTBACKDATA = TAG_REF + "-" + NUM_REF + "--" + TIMESTAMP +

  "∫525976409∫3∫12169-1 株中村農園∫黄金葉ユキヤナギ 2~3年物\n納品時黄緑葉予定∫1寸Pot 6入｜単価 ¥1,100∫1∫on1∫2023-03-01"
  
  //console.log(postBackData)
  const event ={
    type:"follow",//message, postback, follow, unfollow
    timestamp:TIMESTAMP,
    source:{
      userId: "U88989922274b32d7630d8f0070515d3c"//ipad
    },
    postback: {
      data: POSTBACKDATA,
      params: {
        date: "2023-03-03"
      }
    },
    message:{
      text:""
    }
  }

  //リクエスト 前処理
  const SECRET_DOC = await other_api.getDocFmDB("secret")
  const SECRET = SECRET_DOC.data()

  //署名確認 省略
  //const CHANNELSECRET = SECRET.CHANNELSECRET      
  //const SIGNATURE = await authSecretKey(request.headers["x-line-signature"], request.body, CHANNELSECRET)
  
  //httpsRequest インスタンス にアクセストークン格納
  const httpsRequest = new HttpsRequest()
  httpsRequest.ACCESSTOKEN = SECRET.ACCESSTOKEN

  //if(SIGNATURE){
    const HACKTEXT = /[&`$<>*?!(){};|]/g
    //const events = request.body.events
    //return Promise.all(events.map(async (event) => {
    //events.map(async (event) => {
      //イベント情報の取得
      const eventType = event.type
      functions.logger.log(`eventType:${eventType}`)
      //const replyToken = event.replyToken
      const TIMESTAMP_NEW = event.timestamp
      functions.logger.log(`TIMESTAMP_NEW:${TIMESTAMP_NEW}`)
      //let deliveryday = event.postback.params.date  //yyyy-mm-dd

      //Userインスタンス作成     
      const user = new User()
      user.ID = event.source.userId
      user.ID = user.ID.replace(HACKTEXT, "")//ハッキング警戒文字列を削除;
      user.httpsRequest = httpsRequest

      let messagesArray = [];
      Promise.all([user.authUser(), user.getSSIDS()]).then(async () => {
        if(eventType == "message"){
          //メッセージタイプ分岐
          const messageType = event.message.type
          functions.logger.log(`messageType:${messageType}`)
          if(messageType == "text"){
              const textMessage = event.message.text.replace(HACKTEXT,"") //ハッキング警戒文字列を削除
              functions.logger.log(`textMessage:${textMessage}`)

              //文字数制限 ハッキング対策
              if(textMessage.length > 50){
                messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
              }
              else{
                messagesArray = await branchOfTextMessage(TIMESTAMP_NEW, textMessage, user)
              }
          }
          else{
            messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
          }
        }
        else if(eventType == "postback"){
          const postBackData = event.postback.data.replace(HACKTEXT,""); //ハッキング警戒文字列を削除
          functions.logger.log(`postBackData : ${postBackData}`)
          messagesArray = await branch.postBack_process(event, TIMESTAMP_NEW, postBackData, user)
        }
        else if(eventType == "follow"){messagesArray = await user.follow()}
        else if(eventType == "unfollow"){return user.unfollow()}          
        else{
          messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
        }
        
        //返信
        //TODO: タイムアウトするまで継続してしまう。。。
        //return httpsRequest.replyMessageByAxios(event, messagesArray)
        return httpsRequest.pushMessageByAxios(user.ID, messagesArray)        
      })

    //})
  //}
  //else{
    //console.error(`signature Error`);
    //return null
  //}
}())
*/