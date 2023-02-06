/* eslint-disable no-invalid-this */
/* eslint-disable one-var */
require("date-utils");
const functions = require("firebase-functions")

const Products = require("./module//class ProductsList.js");
const User = require("./module/class UsersList.js");
const branch_postBack = require("./module/branch_postBack.js");
//const branch_text = require("./module/branch_text.js");

const FireStore_API = require("./module/npm API/FireStore_API.js");
const HttpsRequest = require("./module/npm API/axios_API.js");

const message_JSON = require("./module/LINE_Messaging_API/message_JSON.js")

//●テキストメッセージ処理分岐
//TODO: postBackへ移行する
async function branchOfTextMessage(TIMESTAMP_NEW, textMessage, user){  
  const message_JSON_irregular = require("./module/LINE_Messaging_API/Irregular.js");
  const message_JSON_Cart = require("./module/LINE_Messaging_API/Cart.js")

  let messagesArray = []
  if(textMessage == "商品情報リスト表示"){
    const products = new Products(user.SSIDS.spSheetId1)

    //TODO: スキップ ORERBUTTON_STATE 発注可能 1 , OPTION_UPSTATE 掲載中 1 → 買参人向けは固定だから判断しなくてもいい。
    messagesArray = await products.getUpStateAllList(1, 1, TIMESTAMP_NEW)  //買参人用、掲載中, タイムスタンプ
    if(messagesArray.length > 0){
      messagesArray.push(message_JSON.getTextMessage("商品リストを上に表示しました。\n「詳細」ボタンを押すと、掲載中の商品をご確認いただけます。"))
    }
  }
  else if(textMessage == "買い物かご確認"){

    //買い物かご内情報確認
    if(user.property.CART.length <= 0){return message_JSON_irregular.whenZeroProductInCart()}
    //買い物かご更新
    //カルーセルメッセージ取得
    //STATE_NEWORDER 新規発注確認: true
    //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
    messagesArray = await message_JSON_Cart.getProductsInCart(user, TIMESTAMP_NEW, true, 2)

    const textMessage = "買い物かご情報を上に表示しました。\n" +
    "買い物かご追加直後の商品は、希望口数は1、希望市場納品日は最短納品可能日が指定されています。\n\n" +
    "「口数」、「納品日」ボタンを押すと、それぞれ変更できます。\n\n" +
    "「削除」ボタンを押すと、買い物かごから削除できます。\n\n" +
    "操作が反映されていないときは、再度買い物かごボタンを押してください。"
    messagesArray.push(message_JSON.getTextMessage(textMessage))

    //リッチメニュー切り替え 保険
    user.setRichMenu()
  }
  else if(textMessage == "メニュー" || textMessage == "設定" ){
    //変数定義
    let columns = []

    const FILES_REF = await FireStore_API.getDocFmDB("files")
    const FILES = FILES_REF[1]
    if(FILES === null){return}

    //発注履歴 
    const POST_BACK_DATA = JSON.stringify({
      postBackTag: "menu",
      command: "checkOrderRecord"
    })
    columns.push(message_JSON.getMenubutton("発注履歴", POST_BACK_DATA))
    
    //マニュアル
    columns.push(message_JSON.getMenubuttonURL("マニュアル", FILES.manualForBuyer, FILES.manualForBuyer))

    //利用規約
    columns.push(message_JSON.getMenubuttonURL("利用規約", FILES.termsForBuyer, FILES.termsForBuyer))
    
    messagesArray.push(message_JSON.getflexCarouselMessage("メニュー", [message_JSON.getCarouselMenulMessageCard(columns)]))
  }
  else{
    messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
  }
  return messagesArray
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
    console.time("measurement of time")
    if (request.method == "POST"){
      //リクエスト 前処理
      const SECRET_REF = await FireStore_API.getDocFmDB("secret")
      const SECRET = SECRET_REF[1]

      //httpsRequest インスタンス にアクセストークン格納
      const httpsRequest = new HttpsRequest()
      httpsRequest.ACCESSTOKEN = SECRET.ACCESSTOKEN

      //署名確認
      const CHANNELSECRET = SECRET.CHANNELSECRET      
      const SIGNATURE = await authSecretKey(request.headers["x-line-signature"], request.body, CHANNELSECRET)

      if(SIGNATURE){
        const HACKTEXT = /[&`$<>*?!(){};|]/g
        const events = request.body.events
        console.log(`events count: ${events.length}`)
        
        return Promise.all(events.map(async (event) => {
          //return events.map(async (event) => {
          //イベント情報の取得
          const eventType = event.type
          functions.logger.log(`eventType:${eventType}`)
          const TIMESTAMP_NEW = event.timestamp
          functions.logger.log(`TIMESTAMP_NEW:${TIMESTAMP_NEW}`)
          
          //ユーザー認証
          const user = new User()
          user.ID = event.source.userId
          user.ID = user.ID.replace(HACKTEXT, "")//ハッキング警戒文字列を削除;
          user.httpsRequest = httpsRequest
          
          return Promise.all([user.authUser(), user.getSSIDs()]).then(async () => {
            let messagesArray = [];          
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
              const postBackData = JSON.parse(event.postback.data.replace(/[&`$<>*?!();|]/g,"")); //ハッキング警戒文字列を削除
              console.log(`postBackData: ${postBackData}`)
              messagesArray = await branch_postBack.process(event, TIMESTAMP_NEW, postBackData, user)
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
    console.timeEnd("measurement of time")
  }
});

/*
(async function(){
}())
*/


/*
//TEST ALL
(async function(){
  //test用
  console.time('measurement of time')
  //TEST用 定数
  const TIMESTAMP = new Date(2023, 0, 25, 15, 55, 29).getTime()
    
  //TAG
  //const TAG_REF = "instantOrder"
  const TAG_REF = "cart"

  //COMMAND
  //単品発注  
  //const NUM_REF = "setDeliveryday"
  //const NUM_REF = "orderConfirm"
  //const NUM_REF = "reOrderConfirm"

  //複数発注発注
  const COMMAND_REF = "check"  
  //const COMMAND_REF = "add"  
  //const COMMAND_REF = "orderConfirm"
  //const COMMAND_REF = "reOrderConfirm"
  const POSTBACKDATA = {
    timeStamp: TIMESTAMP,
    tag: TAG_REF,
    command: COMMAND_REF,
    newOrderNum: 2,
    product: {
      sheetId: 525976409,
      productId: 3,
      producer: "12169-1 (株)中村農園",
      name: "テスト1",
      norm: "1寸Pot 6入｜単価 ¥1,100",
      orderState: 0,
      orderNum: 1,
      deliveryday: "2023-03-01",
    }
  }
  
  //console.log(postBackData)
  const event ={
    type:"postback",//message, postback, follow, unfollow
    timestamp:TIMESTAMP,
    source:{
      userId: "U88989922274b32d7630d8f0070515d3c"//ipad
    },
    postback: {
      data: JSON.stringify(POSTBACKDATA),
      params: {
        date: "2023-03-03"
      }
    },
    message:{
      type: "text",
      text:"商品情報リスト表示" //商品商品情報リスト表示, 
    }
  }

  //リクエスト 前処理
  const SECRET_REF = await FireStore_API.getDocFmDB("secret")
  const SECRET = SECRET_REF[1]

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
      //イベント情報の取得
      const eventType = event.type
      functions.logger.log(`eventType:${eventType}`)
      const TIMESTAMP_NEW = event.timestamp
      functions.logger.log(`TIMESTAMP_NEW:${TIMESTAMP_NEW}`)
      
      //ユーザー認証
      const user = new User()
      user.ID = event.source.userId
      user.ID = user.ID.replace(HACKTEXT, "")//ハッキング警戒文字列を削除;
      user.httpsRequest = httpsRequest
      
      return Promise.all([user.authUser(), user.getSSIDs()]).then(async () => {
          let messagesArray = [];          
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
            const postBackData = JSON.parse(event.postback.data.replace(/[&`$<>*?!();|]/g,"")); //ハッキング警戒文字列を削除
            messagesArray = await branch_postBack.process(event, TIMESTAMP_NEW, postBackData, user)
          }
          else if(eventType == "follow"){messagesArray = await user.follow()}
          else if(eventType == "unfollow"){return user.unfollow()}          
          else{
            messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
          }
        
        //返信
        //return httpsRequest.replyMessageByAxios(event, messagesArray)
        return httpsRequest.pushMessageByAxios(user.ID, messagesArray)        
      })
    //}))
  //}
  //else{
    //console.error(`signature Error`);
    //return null
  //}
}())
*/