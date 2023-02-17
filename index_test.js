/* eslint-disable no-undef */
/* eslint-disable no-invalid-this */
/* eslint-disable one-var */
const functions = require('firebase-functions');

require("date-utils");

const Products = require("./src/module/class ProductsList.js");
const User = require("./src/module/class UsersList.js");
const branch_postBack = require("./src/module/branch_postBack.js");
//const branch_text = require("./module/branch_text.js");
const FireStore_API = require("./src/module/npm API/FireStore_API.js");
const HttpsRequest = require("./src/module/npm API/axios_API.js");

const message_JSON = require("./src/module/LINE_Messaging_API/message_JSON.js")

//●テキストメッセージ処理分岐
//TODO: postBackへ移行する

async function branchOfTextMessage(TIMESTAMP_NEW, textMessage, user){  
  const message_JSON_irregular = require("./src/module/LINE_Messaging_API/Irregular.js");
  const Cart = require("./src/module/LINE_Messaging_API/Cart.js")

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
    messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)

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
    const postBackData = {
      tag: "menu",
      command: "checkOrderRecord"
    }
    columns.push(message_JSON.getMenubutton("発注履歴", postBackData))
    
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

//TEST ALL
(async function(){
  //TEST用 定数
  const TIMESTAMP = new Date().getTime()
    
  //TAG
  //const TAG_REF = "instantOrder"
  const TAG_REF = "cart"
  //const TAG_REF = "menu"

  //COMMAND
  //単品発注  
  //const NUM_REF = "setDeliveryday"
  //const NUM_REF = "orderConfirm"
  //const NUM_REF = "reOrderConfirm"

  //複数発注発注
  //const COMMAND_REF = "check"  
  //const COMMAND_REF = "add"
  //const COMMAND_REF = "selectOrderNum"
  const COMMAND_REF = "orderConfirm"
  //const COMMAND_REF = "reOrderConfirm"

  //メニュー
  //const COMMAND_REF = "checkOrderRecord"

  const POSTBACKDATA = {
    timeStamp: TIMESTAMP,
    tag: TAG_REF,
    command: COMMAND_REF,
    newOrderNum: 2,
    product: {
      deliveryday: "2023-02-27",
      name: "テスト4",
      norm: "4寸Pot 6入｜単価 ¥1,100",
      orderNum: 1,
      orderState: 0,
      producer: "12169-1 (株)中村農園",
      productId: 6,
      sheetId: 525976409,
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

  //署名確認 省略
  //const CHANNELSECRET = SECRET.CHANNELSECRET      
  //const SIGNATURE = await authSecretKey(request.headers["x-line-signature"], request.body, CHANNELSECRET)
  
  //httpsRequest インスタンス にアクセストークン格納
  const httpsRequest = new HttpsRequest(SECRET_REF[1].ACCESSTOKEN)

  //if(SIGNATURE){
    const HACKTEXT = /[&`$<>*?!(){};|]/g
    //const events = request.body.events
    //return Promise.all(events.map(async (event) => {
      //イベント情報の取得
      const eventType = event.type
      console.log(`eventType:${eventType}`)
      const TIMESTAMP_NEW = event.timestamp
      console.log(`TIMESTAMP_NEW:${TIMESTAMP_NEW}`)
      
      //ユーザー認証
      const user = new User()
      user.ID = event.source.userId
      user.ID = user.ID.replace(HACKTEXT, "")//ハッキング警戒文字列を削除;
      user.httpsRequest = httpsRequest

      await Promise.all([user.authUser(), user.getSSIDs()])
      
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
        const postBackData = JSON.parse(event.postback.data.replace(/[&`$<>*?!();|]/g,"")); //ハッキング警戒文字列を削除
        messagesArray = await branch_postBack.process(event, TIMESTAMP_NEW, postBackData, user)
      }
      else if(eventType == "follow"){messagesArray = await user.follow()}
      else if(eventType == "unfollow"){return user.unfollow()}          
      else{
        messagesArray.push(message_JSON.getTextMessage("恐れ入りますが、個別のメッセージには対応しておりません。\n当社までお電話いただくか窓口にてお問合わせくださいませ。"))
      }
        
      //返信
      httpsRequest.pushMessageByAxios(user.ID, messagesArray)
      //})
}())