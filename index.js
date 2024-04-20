/* eslint-disable no-undef */
/* eslint-disable no-invalid-this */
/* eslint-disable one-var */
const functions = require('firebase-functions');
const logger = functions.logger

require("date-utils");

const User = require("./module/class UsersList.js");
const branch_postBack = require("./module/branch_postBack.js");
//const branch_text = require("./module/branch_text.js");
const HttpsRequest = require("./module/npm API/axios_API.js");
const SECRET = require("./module/npm API/secret.js");
const FireStore_API = require("./module/npm API/FireStore_API.js");

const message_JSON = require("./module/LINE_Messaging_API/message_JSON.js")

//●テキストメッセージ処理分岐
//TODO: セキュリティのためpostBackへ移行するためにリッチメニューを作り直す
const message_JSON_irregular = require("./module/LINE_Messaging_API/Irregular.js");
const Cart = require("./module/LINE_Messaging_API/Cart.js")
const branchOfTextMessage = async (TIMESTAMP_NEW, textMessage, user) => {  
  let messagesArray = []
  if(textMessage == "商品情報リスト表示"){
    messagesArray = await FireStore_API.getUpStateAllList(TIMESTAMP_NEW, true)  //買参人用、掲載中, タイムスタンプ
  }
  else if(textMessage == "買い物かご確認"){    
    //買い物かご内情報確認
    if(user.property.CART.length <= 0){
      user.setRichMenu()
      return await message_JSON_irregular.whenZeroProductInCart()
    }

    //買い物かご カルーセルメッセージ取得
    //STATE_NEWORDER 新規発注確認: true
    //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
    messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)

    //const textMessage = "最初は、希望口数1、最短納品可能日が指定されています。\n\n「口数」、「納品日」ボタンを押すと、それぞれ変更できます。"
    //messagesArray.push(message_JSON.getTextMessage(textMessage))

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
    messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、任意のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
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
  
  if(request.headers["x-line-signature"] != SIGNATURE_DIGEST) throw new Error(`signature Error`)
  return
}

//Post受信
module.exports.helloWorld =  functions.region("asia-northeast1")
.runWith({
  //timeoutSeconds: 60,
  minInstances: 1, //インスタンスをwarmスタートに設定 応答速度に影響 コストがかかる  
  maxInstances: 10,//同時に処理できる最大インスタンス数 コストを抑える
  //memory: "1GB",  //呼び出し回数の無料枠を超えると、コストがかかる。メモリ容量を大きくすると、有料枠の単価が上がる。
}).https.onRequest(async (request, response) => {
  try{
    if (request.method != "POST") return logger.error(`NOT POST REQUEST`);
    
    //リクエスト 前処理
    const events = request.body.events
    console.log(`events count: ${events.length}`)

    const SECRETS = JSON.parse(await SECRET.getString(process.env.SECRETS_NAME, process.env.SECRETS_VERSION))
    
    //httpsRequest インスタンス にアクセストークン格納
    const httpsRequest = new HttpsRequest(SECRETS.ACCESSTOKEN)

    //DB取得
    const dbData = await FireStore_API.accessFirestore("getDB")

    let messagesArray = []

    //GASからのリクエスト
    if(request.headers["x-line-signature"] === null || request.headers["x-line-signature"] === undefined){          
      console.log("GASからのリクエスト")
      const GASCODE = await SECRET.getString(process.env.GASCODE_NAME, process.env.GASCODE_VERSION)
      return Promise.all(events.map(async (event) => {
        if(event.code == GASCODE){
          console.log(`type: ${event.type} | name: ${event.name}`)

          if(event.type == "sendMessage"){
            const userIds = []              
            for(let userId in dbData.user_buyer){
              //console.log(`${userId} ${dbData.user_buyer[userId].STATE}`)
              if(dbData.user_buyer[userId].STATE != "ブロック"){
                userIds.push(userId)
              }
            }

            const newDate = new Date()
            const TIMESTAMP_NEW = newDate.getTime()
            if(event.name == "text"){
              messagesArray = [message_JSON.getTextMessage(event.data)]
            }
            else if(event.name == "list"){
              messagesArray = await FireStore_API.getUpStateAllList(TIMESTAMP_NEW, true)  //買参人用、掲載中, タイムスタンプ
            }

            //メッセージ送信
            console.log(`userIds: ${userIds.length}`)
            for(let userId of userIds){
              await httpsRequest.pushMessageByAxios(userId, messagesArray)
            }
          }
          else{
            throw new Error(`不正アクセス`);
          }              
        }
        return
      }))
    }
    //LINEサーバーからのリクエスト
    else{
      //console.log("LINEサーバーからのリクエスト")

      //署名確認
      authSecretKey(SECRETS.CHANNELSECRET, request)      
      const HACKTEXT = /[`$<>*?!(){};|]/g      
      return Promise.all(events.map(async (event) => {
        
        //イベント情報の取得
        const eventType = event.type
        const TIMESTAMP_NEW = event.timestamp
        const eventState = `TIMESTAMP_NEW:${TIMESTAMP_NEW} | eventType:${eventType}`
        const userId = event.source.userId

        //ユーザー認証
        const user = new User(userId, dbData.user_buyer[userId])
        user.httpsRequest = httpsRequest
        await user.auth(eventType)
        
        if(eventType == "message"){
          //メッセージタイプ分岐
          const messageType = event.message.type            
          if(messageType == "text"){
            const textMessage = event.message.text.replace(HACKTEXT,"") //ハッキング警戒文字列を削除
            console.log(`${eventState} | textMessage:${textMessage}`)
            
            if(textMessage.length > 50){ //文字数制限 ハッキング対策
              messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
            }
            else{
              messagesArray = await branchOfTextMessage(TIMESTAMP_NEW, textMessage, user)
            }
          }
          else{
            messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、任意のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
          }
        }
        else if(eventType == "postback"){
          const postBackData = JSON.parse(event.postback.data.replace(/[`$<>*?!();|]/g,"")); //ハッキング警戒文字列を削除
          console.log(`${eventState} | TAG: ${postBackData.tag} | COMMAND: ${postBackData.command}`)
          messagesArray = await branch_postBack.process(event, TIMESTAMP_NEW, user, postBackData)
        }
        else if(eventType == "follow"){
          messagesArray = await user.getfollowMessage()            
        }
        else if(eventType == "unfollow"){await user.unfollow()}
        else{messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、当メッセージタイプには対応しておりません。"))}            
        
        //返信          
        return await httpsRequest.replyMessageByAxios(event, messagesArray)
      }))
    }
  } 
  catch(e){ logger.error(e) }
  finally { response.end() }
});