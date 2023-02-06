/* eslint-disable one-var */
const property = require("../property.js");
const timeMethod = require("../getTime.js");
const Products = require("../class ProductsList.js");

const message_JSON = require("./message_JSON.js");
const Irregular = require("./Irregular.js");
const flexMessage_ForBuyer = require("./Flex Message Parts For Buyer.js");
const Order = require("./Order.js");


//●単品 発注内容確認
//口数チェック 不要
//納品日チェック STATE_CHECK_DELIVERYDAY  テキスト、納品期間チェック不要:0, 荷受け日、ブロック日チェック: 1
module.exports.getCarouselMessage = async function(user, postBackData, STATE_CHECK_DELIVERYDAY = 0){
  //●前処理
  const plSheet= new Products(user.SSIDS.spSheetId1, postBackData.product.sheetId) 
  const masterProductArray = await plSheet.getRowData(postBackData.product.productId)
  let textOrderNum, textDeliveryday

  //商品情報確認
  const STATE_PRODUCTINFO = Order.certificationProductInfo(postBackData, masterProductArray)
  if(STATE_PRODUCTINFO){return Irregular.whenOldProductInfo()}

  //口数チェック 不要
  textOrderNum = "希望口数：" + postBackData.product.orderNum

  //納品日チェック
  //テキスト、納品期間チェック不要
  //荷受け日、ブロック日チェック
  let AFTER_DELIVERYDAY, desiredDeliveryday, CHANGE_DELIVERYDAY_STATE
  if(STATE_CHECK_DELIVERYDAY == 1){    
    AFTER_DELIVERYDAY = Order.certificationDeliveryday(new Date(postBackData.product.deliveryday))
    desiredDeliveryday = AFTER_DELIVERYDAY[0]
    CHANGE_DELIVERYDAY_STATE = AFTER_DELIVERYDAY[1]
    textDeliveryday = "希望市場納品日：" + timeMethod.getDisplayFmtDate(desiredDeliveryday)

    //変わったらpostBackData書き換え
    if(CHANGE_DELIVERYDAY_STATE){
      postBackData.product.deliveryday = desiredDeliveryday
      textDeliveryday = textDeliveryday + "\n※翌競り日に変更しました"
    }
  }
  else{
    textDeliveryday = "希望市場納品日：" + timeMethod.getDisplayFmtDate(desiredDeliveryday)
  }  

  //メッセージ作成
  console.log(`--postBackData: ${postBackData}`)
  console.log(`--発注情報: ${textOrderNum},  ${textDeliveryday}`)

  //コンテンツ
  let messagesArray= []
  let bodyContents  = [], imageContents = [], footerContents = []
  
  let label1 = "発注確定"
  let postdata1 = {
    timeStamp: postBackData.timeStamp,
    tag: postBackData.tag,
    command: "orderConfirm",
    product: postBackData.product
  }

  let label2 = "キャンセル", postdata2 = JSON.stringify({tag: "cancel"})
  
  //在庫有無確認
  const stockNow = masterProductArray[property.constPL.columns.stockNow]
  if(stockNow <= 0){
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL("https://drive.google.com/uc?id=1O0Y4sc-vMYE7-5LPF0tbywHG7Owt0TKO"), imageContents))  //商品情報１  上部ラベル、完売画像、残口
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(postBackData, masterProductArray[property.constPL.columns.deliveryPeriod])) //商品情報2   商品名～市場納品期間
    bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo("-", "-"))  //発注情報  

    //メッセージ1
    messagesArray.push(message_JSON.getflexCarouselMessage("発注内容", [flexMessage_ForBuyer.getProductCardForBuyer(bodyContents, footerContents)]))

    //メッセージ2
    messagesArray.push(Irregular.whenStockNone()[0])
    return messagesArray
  }

  imageContents = flexMessage_ForBuyer.getCardlabel(imageContents, "発注内容")  //上部ラベル  
  imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "残" + stockNow + "口")  //残口
  bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(masterProductArray[property.constPL.columns.picUrl]), imageContents))//商品情報１  上部ラベル、商品画像、残口
  bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(postBackData, masterProductArray[property.constPL.columns.deliveryPeriod]))                                                          //商品情報2   商品名～市場納品期間
  bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo(textOrderNum, textDeliveryday))  //発注情報

  //発注情報 初確認
  //console.log(`postBackData.product.orderState: ${postBackData.product.orderState}`)
  let textMessage = ""
  if(postBackData.product.orderState == 0){
    postBackData.product.orderState = 2
    
    //メッセージ2
    textMessage += "最初は、希望口数1、最短納品可能日が指定されています。\n\n「口数」、「納品日」ボタンを押すと、それぞれ変更できます。"
  }

  //2回目以降の発注内容表示にはテキストメッセージ「最初は、～」不要
  else if(postBackData.product.orderState == 2){
    //荷受け日、ブロック日を翌競り日に変更
    if(CHANGE_DELIVERYDAY_STATE){
      textMessage += "市場納品日は、希望日の翌競り日に修正させていただきました。\nご了承ください。"
    }
    //TODO: スキップ 納品期間外
  }

  //発注情報 確認済み 再発注の際は、事前に納品日を変更済み
  else if(postBackData.product.orderState == 1){
    label1 = "追加発注確定"
    postdata1.command = "reOrderConfirm"
    //console.log(`追加発注確定 ${postBackData} : ${postBackDatareOrderConfirem}`)
    
    //メッセージ2
    textMessage += "上記商品は同納品日に発注済みです。\n\n再発注でしたら、上の追加発注確定ボタンを押してください。";
  }

  //footer1 
  const postBackData_selectOrderNum = {
    timeStamp: postBackData.timeStamp,
    tag: postBackData.tag,
    command: "selectOrderNum",
    product: postBackData.product
  }  
  footerContents.push(flexMessage_ForBuyer.getCardfooterBottun("口数", "口数変更", postBackData_selectOrderNum))

  const postBackData_setDeliveryday = {
    timeStamp: postBackData.timeStamp,
    tag: postBackData.tag,
    command: "setDeliveryday",
    product: postBackData.product
  }

  const SD_FMT_LINE = timeMethod.getDeliverydayYMD(masterProductArray[property.constPL.columns.sDeliveryday], 0)//納品開始日
  const ED_FMT_LINE = timeMethod.getDeliverydayYMD(masterProductArray[property.constPL.columns.eDeliveryday], 1)//納品終了日
  footerContents.push(flexMessage_ForBuyer.getCardfooterDeliverydayBottun("納品日", postBackData_setDeliveryday, SD_FMT_LINE, ED_FMT_LINE))


  //メッセージ1 カルーセルメッセージ
  const explainText = "希望商品・口数・納品日を\nご確認ください。\n\n問題なければ下の\n「発注確定」ボタンを押してください。"
  messagesArray.push(message_JSON.getflexCarouselMessage("発注内容", [flexMessage_ForBuyer.getProductCardForBuyer(bodyContents, footerContents), flexMessage_ForBuyer.getCardOrderCertification(explainText, label1, postdata1, label2, postdata2)]))

  //メッセージ2 コメント
  if(textMessage != ""){messagesArray.push(message_JSON.getTextMessage(textMessage))}

  return messagesArray
}

//●発注確定 単品発注
module.exports.orderConfirm = async function(user, TIMESTAMP, postBackData, orderRecords){
  console.log("")
  //●メッセージ作成・送信
  let messagesArray= []

  //●前処理
  //前処理 固有 商品リストと照合するための情報準備
  //posaBackData 抽出
  const sheetId = postBackData.product.sheetId
  const pId = postBackData.product.productId
  const orderNum = postBackData.product.orderNum
  const deliveryday = postBackData.product.deliveryday

  //posaBackDataからスプレッドシートの情報を取得
  const plSheet= new Products(user.SSIDS.spSheetId1, sheetId)
  plSheet.SSIDS = user.SSIDS
  const masterProductArray = await plSheet.getRowData(pId)
  //console.log(`masterProductArray : ${masterProductArray}`)
  //TODO: スキップ スプレッドシートの情報を取得できなかったときの対処
  if(masterProductArray == undefined){
    console.log(`商品マスタ情報に問題があります。`)
    console.log(`シートID : ${sheetId} 商品ID : ${pId}  商品マスタ情報：${masterProductArray}`)
  }
  const STOCKNOW = masterProductArray[property.constPL.columns.stockNow]
  //const upState = masterProductArray[property.constPL.columns.upState]  単品発注できる時点で掲載中なので不要

  //console.log(postBackData.product.name])          
  
  //商品情報確認
  const STATE_PRODUCTINFO = Order.certificationProductInfo(postBackData, masterProductArray)

  //発注不可条件
  //在庫<0、または商品情報が異なる
  if(STOCKNOW <= 0){return [message_JSON.getTextMessage(Irregular.whenStockNone())]}
  else if(STATE_PRODUCTINFO){return [message_JSON.getTextMessage(Irregular.whenOldProductInfo())]}

  //納品日確認 不要
  //新規発注データ準備            
  //新規発注情報配列（スプレッドシート格納用）
  const orderDataArray = orderRecords.getOrderArray(TIMESTAMP, sheetId, masterProductArray, orderNum, deliveryday)
  
  //再発注伺い 条件
  //新規発注、かつ発注履歴有、かつ各発注履歴について、発注しようとしている情報との重複がある → 再発注
  if(postBackData.product.orderState != 1 && orderRecords.recordNum > 0 && orderRecords.certificateOrderRecord(masterProductArray, deliveryday, false)){
    console.log(`再発注伺い`)
    const AFTER_ORDER_STATE = 1
    postBackData.product.orderState = AFTER_ORDER_STATE
    console.log(`postBackData: ${postBackData}`)
    return await module.exports.getCarouselMessage(user, TIMESTAMP, postBackData, AFTER_ORDER_STATE, orderNum, deliveryday, 0, 0)
  }
  
  //発注履歴なし
  //発注履歴あり、かつ各発注履歴について、発注しようとしている情報との重複がない
  //再発注伺い済み
  else{
    console.log(`新規発注情報 登録`)
    //発注完了メッセージ
    const TEXT_ORDERINFO = "●" + postBackData.product.name + postBackData.product.norm +
      "\n希望口数:" + orderNum + "\n希望納品日:" + timeMethod.getDisplayFmtDate(deliveryday)
    const STATE_ORDERHIS = [1, [TEXT_ORDERINFO]]
    const STATE_REORDER = false //再発注:true, 再発注でない:false

    messagesArray = Order.replyOrderConfirmTextMessage(STATE_ORDERHIS, STATE_REORDER, user, TIMESTAMP);

    //発注履歴挿入
    orderRecords.insertOrderRecord([orderDataArray])

    //在庫管理
    await plSheet.setNewStock(pId, STOCKNOW, orderNum)
    //TODO: 同期処理したい
    plSheet.sheet.saveUpdatedCells(); // save all updates in one call

    return messagesArray
  }  
}