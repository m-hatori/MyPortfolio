/* eslint-disable no-undef */
/* eslint-disable no-invalid-this */
/* eslint-disable one-var */
const functions = require('firebase-functions');
require("date-utils");

const { getUpStateAllList } = require("./module/npm API/FireStore_API.js");
const SpreadSheet_API = require("./module/npm API/SpreadSheet_API.js");
const property = require("./module/property.js");

const User = require("./module/class UsersList.js");
const branch_postBack = require("./module/branch_postBack.js");
//const branch_text = require("./module/branch_text.js");
const HttpsRequest = require("./module/npm API/axios_API.js");
const SECRET = require("./module/npm API/secret.js");

const message_JSON = require("./module/LINE_Messaging_API/message_JSON.js")


//●テキストメッセージ処理分岐
//TODO: postBackへ移行する
const message_JSON_irregular = require("./module/LINE_Messaging_API/Irregular.js");
const Cart = require("./module/LINE_Messaging_API/Cart.js")
async function branchOfTextMessage(TIMESTAMP_NEW, textMessage, user){  
  let messagesArray = []
  if(textMessage == "商品情報リスト表示"){
    messagesArray = await getUpStateAllList(TIMESTAMP_NEW, true)  //買参人用、掲載中, タイムスタンプ
  }
  else if(textMessage == "買い物かご確認"){    
    //買い物かご内情報確認
    if(user.property.CART.length <= 0){
      user.setRichMenu()
      return message_JSON_irregular.whenZeroProductInCart()
    }

    //買い物かご更新
    //カルーセルメッセージ取得
    //STATE_NEWORDER 新規発注確認: true
    //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
    messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)

    const textMessage = "最初は、希望口数1、最短納品可能日が指定されています。\n\n「口数」、「納品日」ボタンを押すと、それぞれ変更できます。"
    messagesArray.push(message_JSON.getTextMessage(textMessage))

    //リッチメニュー切り替え 保険
    user.setRichMenu()
  }
  else if(textMessage == "メニュー" || textMessage == "設定" ){
    //変数定義
    let columns = []

    //発注履歴 
    const postBackData = {
      tag: "menu",
      command: "checkOrderRecord"
    }
    columns.push(message_JSON.getMenubutton("発注履歴", postBackData))
    
    //マニュアル
    columns.push(message_JSON.getMenubuttonURL("マニュアル", process.env.MANUAL_FOR_BUYER, process.env.MANUAL_FOR_BUYER))

    //利用規約
    columns.push(message_JSON.getMenubuttonURL("利用規約", process.env.TERMS_FOR_BUYER, process.env.TERMS_FOR_BUYER))
    
    messagesArray.push(message_JSON.getflexCarouselMessage("メニュー", [message_JSON.getCarouselMenulMessageCard(columns)]))
  }
  else{
    messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
  }
  return messagesArray
}

//署名検証
const authSecretKey = (CHANNELSECRET, request) => {
  const crypto = require('crypto');
  const SIGNATURE_DIGEST = crypto
    .createHmac("SHA256", CHANNELSECRET)
    .update(JSON.stringify(request.body))
    .digest("base64");
  //console.log(`SIGNATURE_DIGEST : ${SIGNATURE_DIGEST}`)
  
  if(request.headers["x-line-signature"] == SIGNATURE_DIGEST){
    return true
  }
  else{
    return false
  }
}

//Post受信
module.exports.helloWorld =  functions
  .runWith({
    //timeoutSeconds: 10,
    minInstances: 1, //インスタンスをwarmスタートに設定 応答速度に影響 コストがかかる  
    maxInstances: 10,//同時に処理できる最大インスタンス数
    //memory: "1GB",  //呼び出し回数の無料枠を超えると、コストがかかる。メモリ容量を大きくすると、有料枠の単価が上がる。
  })
  .region("asia-northeast1")
  .https.onRequest(async (request, response) => {
    try{
      if (request.method === "POST"){
        //リクエスト 前処理
        const events = request.body.events
        console.log(`events count: ${events.length}`)

        //GASからのスプレッドシート更新要請
        const GASCODE = await SECRET.getString(process.env.GASCODE_NAME, process.env.GASCODE_VERSION)
        for(let event of events){
          if(event.code == GASCODE){
            if(event.type == "upDateSpreadSheet"){
              if(event.name ==  "productsList"){
                for(let sheetId of property.productsSheetIds){
                  await SpreadSheet_API.upDateSpreadSheet_ProductsList(sheetId)
                }  
                console.log(`スプレッドシート 商品リスト初期化更新完了`)
              }
              else if(event.name ==  "orderList"){
                await SpreadSheet_API.upDateSpreadSheet_OrderList()
                console.log(`スプレッドシート 発注リスト初期化更新完了`)
              }              
            }
            else{
              console.error(`不正アクセス`);
            }
            return
          }
        }

        //署名確認
        const SECRETS = JSON.parse(await SECRET.getString(process.env.SECRETS_NAME, process.env.SECRETS_VERSION))
        if(authSecretKey(SECRETS.CHANNELSECRET, request)){
          //httpsRequest インスタンス にアクセストークン格納
          const httpsRequest = new HttpsRequest()
          httpsRequest.ACCESSTOKEN = SECRETS.ACCESSTOKEN
          
          const HACKTEXT = /[`$<>*?!(){};|]/g
          
          return Promise.all(events.map(async (event) => {
            //return events.map(async (event) => {
            //イベント情報の取得
            const eventType = event.type
            console.log(`eventType:${eventType}`)
            const TIMESTAMP_NEW = event.timestamp
            console.log(`TIMESTAMP_NEW:${TIMESTAMP_NEW}`)
            
            //ユーザー認証
            const user = new User()
            user.ID = event.source.userId
            user.SECRETS = SECRETS
            user.httpsRequest = httpsRequest
            
            await user.authUser()
            
            let messagesArray = [];
            if(eventType == "message"){
              //メッセージタイプ分岐
              const messageType = event.message.type
              console.log(`messageType:${messageType}`)
              if(messageType == "text"){
                  const textMessage = event.message.text.replace(HACKTEXT,"") //ハッキング警戒文字列を削除
                  console.log(`textMessage:${textMessage}`)

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
              const postBackData = JSON.parse(event.postback.data.replace(/[`$<>*?!();|]/g,"")); //ハッキング警戒文字列を削除
              console.log(`postBackData: ${JSON.stringify(postBackData)}`)
              messagesArray = await branch_postBack.process(event, TIMESTAMP_NEW, postBackData, user)
            }
            else if(eventType == "follow"){messagesArray = await user.follow()}
            else if(eventType == "unfollow"){return user.unfollow()}          
            else{
              messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
            }            
            
            //返信
            if(messagesArray.length > 0){httpsRequest.replyMessageByAxios(event, messagesArray)}
            return
          }))
        }
        else{
          console.error(`signature Error`);
          return
        }
        
      }
      else{
        return console.error(`NOT POST REQUEST`);
      }
    }
    catch(e){
      return console.error(e)      
    }
    finally{
      response.end()
    }
  });