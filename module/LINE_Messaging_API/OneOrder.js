/* eslint-disable one-var */
//単品発注用 メソッド群
const property = require("../property.js");
const timeMethod = require("../getTime.js");

const Products = require("../class ProductsList.js");
const OrderRecords = require("../class OrdersList.js");

const message_JSON = require("./message_JSON.js");
const Irregular = require("./Irregular.js");
const flexMessage_ForBuyer = require("./Flex Message Parts For Buyer.js");
const Order = require("./Order.js");

const StampMessage = require("./Class Stamp.js");


//●単品 発注内容確認
//STATE_NEWORDER|商品情報をplSheet, productInfoArrayから取得: true、商品情報をDBから取得: false
//口数チェック|不要
//口数納品日テキストチェック 単品発注では不要。買い物かご発注では必要。
//STATE_CHECK_DELIVERYDAY|荷受け日、ブロック日チェック 必要: true, 不要: false 
//STATE_CHECK_DELIVERYPERIOD|納品期間チェック 単品発注では不要。買い物かご発注では必要。
module.exports.getCarouselMessage = async (postBackData, STATE_NEWORDER = false, STATE_CHECK_DELIVERYDAY = false) => {
  //メッセージ
  let messagesArray = []
  let textOrderNum = "", textDeliveryday = ""
  let card, columns = []  
  let bodyContents  = [], imageContents = [], footerContents = []

  //商品情報取得
  const [plSheet, productInfoArray] = await Order.getProductsInfo(postBackData)

  //商品情報確認
  //掲載中確認 単品発注できる時点で掲載中なので不要

  //在庫不足
  const StockNow = productInfoArray[property.constPL.columns.stockNow]
  if(StockNow <= 0 ){
    //●口数
    textOrderNum = "-"

    //●納品日
    textDeliveryday = "-"
    
    //●メッセージ1 商品カード
    let title = "発注内容"
    //imageContents = flexMessage_ForBuyer.getCardlabel(imageContents, "発注内容")  //上部ラベル

    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(process.env.PICURL_SOLDOUT), imageContents))//商品情報１  上部ラベル、商品画像、残口
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(productInfoArray))//商品情報2   商品名～市場納品期間
    bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo(textOrderNum, textDeliveryday))  //発注情報

    card = flexMessage_ForBuyer.getProductCardForBuyer(title, bodyContents, footerContents)
    columns.push(card)
    messagesArray.push(message_JSON.getflexCarouselMessage("発注内容", columns))

    //メッセージ2
    messagesArray.push(Irregular.whenStockNone()[0])
    return messagesArray
  }
  else{
    //●口数
    textOrderNum = "希望口数：" + postBackData.product.orderNum

    //●納品日
    //荷受け日、ブロック日チェック
    let desiredDeliveryday, CHANGE_DELIVERYDAY_STATE
    if(STATE_CHECK_DELIVERYDAY){
      [desiredDeliveryday, CHANGE_DELIVERYDAY_STATE] = timeMethod.checkDeliveryday(postBackData.product.deliveryday)      
      
      //変わったらpostBackData書き換え
      if(CHANGE_DELIVERYDAY_STATE){
        postBackData.product.deliveryday = desiredDeliveryday
        textDeliveryday = textDeliveryday + "\n※翌競り日に変更しました"
      }
    }
    textDeliveryday = "希望市場納品日：" + timeMethod.getDateFmt(postBackData.product.deliveryday, "orderList_deliveryday")
    
    //●メッセージ1 商品カード
    //body
    //imageContents = flexMessage_ForBuyer.getCardlabel(imageContents, "発注内容")  //上部ラベル  
    let title = "発注内容"
    imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, `残${StockNow}口`)  //残口
    const picUrl = flexMessage_ForBuyer.getCardPicURL(productInfoArray[property.constPL.columns.picUrl])
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(picUrl, imageContents))//商品情報１  上部ラベル、商品画像、残口
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(productInfoArray))  //商品情報2   商品名～市場納品期間
    bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo(textOrderNum, textDeliveryday))  //発注情報
    //console.log(`発注内容 body picUrl: ${picUrl} ${textOrderNum} ${textDeliveryday}`)

    //footer
    const postBackData_base = {
      timeStamp: postBackData.timeStamp,
      tag: "instantOrder",
      product: postBackData.product
    }    

    let postBackData_selectOrderNum = postBackData_base
    postBackData_selectOrderNum.command = "selectOrderNum"
    //console.log(`postBackData_selectOrderNum: ${JSON.stringify(postBackData_selectOrderNum)}`)
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWithText("口数", postBackData_selectOrderNum, "口数変更"))

    let postBackData_setDeliveryday = postBackData_base
    postBackData_setDeliveryday.command = "setDeliveryday"
    //console.log(`postBackData_setDeliveryday: ${JSON.stringify(postBackData_setDeliveryday)}`)
    
    footerContents.push(flexMessage_ForBuyer.getCardfooterDeliverydayBottun("納品日", postBackData_setDeliveryday, productInfoArray))
    card = flexMessage_ForBuyer.getProductCardForBuyer(title, bodyContents, footerContents)
    columns.push(card)

    //●右端カード
    //footer
    let label1 = "発注確定"
    let postdata1 = {
      timeStamp: postBackData.timeStamp,
      tag: "instantOrder",
      command: "orderConfirm",
      product: postBackData.product
    }
    
    //発注状況
    let textMessage = ""
    
    //発注情報 初確認
    if(postBackData.product.orderState == 0){
      //textMessage += "最初は、希望口数1、希望市場納品日は最短納品可能日が指定されています。\n\n「口数」、「納品日」ボタンを押すと、それぞれ変更できます。"
    }
    //2回目以降の発注内容表示にはテキストメッセージ「最初は、～」不要
    else if(postBackData.product.orderState == 2){
      //荷受け日、ブロック日を翌競り日に変更
      if(CHANGE_DELIVERYDAY_STATE){
        textMessage += "翌競り日に修正させていただきました。ご了承ください。"
      }      
    }
    //発注情報 確認済み 再発注の際は、事前に納品日を変更済み
    else if(postBackData.product.orderState == 1){
      label1 = "追加発注確定"
      postdata1.command = "reOrderConfirm"
      textMessage += "上記商品は同納品日に発注済みです。\n\n再発注でしたら、上の追加発注確定ボタンを押してください。";
    }
    
    const explainText = "最初は、希望口数1、希望市場納品日は最短納品可能日が指定されています。\n\n「口数」、「納品日」ボタンを押すと、それぞれ変更できます。\n\n\n" + 
    "希望商品・口数・納品日を\n確認ください。\n\n問題なければ下の\n「発注確定」ボタンを押してください。"

    const label2 = "キャンセル"
    let postdata2 = {
      timeStamp: postBackData.timeStamp,
      tag: "cancel",
      command: "cancel",
      product: postBackData.product
    }

    card = flexMessage_ForBuyer.getCardOrderCertification(explainText, label1, postdata1, label2, postdata2)
    columns.push(card)    
    messagesArray.push(message_JSON.getflexCarouselMessage("発注内容", columns))

    //メッセージ2
    if(textMessage != ""){messagesArray.push(message_JSON.getTextMessage(textMessage))}

    return messagesArray
  }
}

//●単品 発注確定
module.exports.orderConfirm = async (TIMESTAMP_NEW, user, postBackData_timeStamp, postBackData) => {
  //●前処理
  //変数定義:メッセージ
  let messagesArray = []
  
  //変数定義:商品リスト情報
  const plSheets = {}
  const orderArrays = []

  //発注履歴取得
  const orderRecords = new OrderRecords(user)
  await orderRecords.getDB()

  //発注確定ボタン 2度押し確認
  const DOUBLE_ORDER_STATE = await orderRecords.checkOrderRecordTimeStamp(postBackData_timeStamp, postBackData.product.name)
  if(DOUBLE_ORDER_STATE){
    messagesArray.unshift(message_JSON.getTextMessage("発注手続き済みです"))
    return [messagesArray, orderArrays, plSheets]
  }
  
  //posaBackDataから商品リストの情報を取得
  const [plSheet, productInfoArray] = await Order.getProductsInfo(postBackData)
      
  //発注不可条件: 在庫<0
  //商品情報確認 単品発注できる時点で掲載中なので不要
  //納品日確認 不要
  const STOCKNOW = productInfoArray[property.constPL.columns.stockNow]  
  
  if(STOCKNOW <= 0){
    messagesArray = Irregular.whenStockNone()
    return [messagesArray, orderArrays, plSheets]
  }

  //●発注情報 仕分け
  //再発注伺い
  //条件: 発注情報 未確認、かつ発注履歴有、かつ各発注履歴について、発注しようとしている情報との重複がある
  if(postBackData.product.orderState != 1 && orderRecords.recordNum > 0 && await orderRecords.checkNewOrderisOrdered(productInfoArray, postBackData.product.deliveryday)){
    console.log(`--再発注伺い`)
    postBackData.product.orderState = 1
    messagesArray = await module.exports.getCarouselMessage(postBackData, false, false)//?
  }

  //新規発注情報を発注リストに登録
  //条件: 発注履歴なし、または発注履歴あり、かつ各発注履歴について、発注しようとしている情報との重複がない。または再発注伺い済み
  else{
    console.log(`--新規発注情報を発注リストに登録`)
    //希望納品日
    const desiredDeliveryday = timeMethod.getDateFmt(postBackData.product.deliveryday, "orderList_deliveryday")
   
    //発注履歴挿入
    orderArrays.push(orderRecords.getOrderArray(postBackData_timeStamp, postBackData, productInfoArray, desiredDeliveryday))
    //user.order.push(orderRecords.getOrderArray(postBackData_timeStamp, postBackData, productInfoArray, desiredDeliveryday))
    //user.updateOrderDB()

    //在庫更新 スプレッドシートに反映
    const newStock = await plSheet.getNewStock(postBackData.product.productId, postBackData.product.orderNum)
    plSheets[postBackData.product.sheetId] = {
      plSheet: plSheet,
      order: [{pId: postBackData.product.productId, productName: postBackData.product.name, newStock: newStock}]
    };

    //発注完了メッセージ
    const textMessage = "●" + postBackData.product.name + "\n" +
    postBackData.product.norm + "\n" +
    "希望口数: " + postBackData.product.orderNum + "\n" +
    "希望納品日: " + desiredDeliveryday + "\n\n" +
    
    "以上1件の発注が完了しました。\n\n" +
    "またのご利用をお待ちしております。"
    
    //console.log(`発注完了メッセージ: ${textMessage}`)
    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().ありがとう);

  }
  return [messagesArray, orderArrays, plSheets]
}