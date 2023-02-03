/* eslint-disable one-var */
const property = require("./property.js");
const postCode_JSON = require("./postCode_JSON.js")
const timeMethod = require("./getTime.js");
const flexMessage_ForBuyer = require("./Flex Message For Buyer.js");
const message_JSON = require("./message_JSON.js");
const message_JSON_irregular = require("./message_JSON_irregular.js");
const message_JSON_Order = require("./message_JSON_Order.js");

const Products = require("./class sheet ProductsList.js");

//●単品 発注内容確認
//口数チェック 不要
//納品日チェック STATE_CHECK_DELIVERYDAY  テキスト、納品期間チェック不要:0, 荷受け日、ブロック日チェック: 1
//CHANGE_STATE 口数変更: true, 納品日変更: false, その他: ""
async function getCarouselOneOrderCeritification(user, TIMESTAMP, postBackData, postBackDataArray, CHECK_ORDER_STATE, orderNum, desiredDeliveryday, STATE_CHECK_DELIVERYDAY = 0, CHANGE_STATE = 0){
  console.log("")
  console.log("単品 発注内容確認 メッセージ引数")
  //●前処理
  const orderNumber = orderNum.replace("on","");
  
  const plSheet= new Products(user.SSIDS.spSheetId1, postBackDataArray[postCode_JSON.postBackDataLabels.sheetId]) 
  const masterProductArray = await plSheet.getRowData(postBackDataArray[postCode_JSON.postBackDataLabels.productId])
  let textOrderNum, textDeliveryday

  //商品情報確認
  const STATE_PRODUCTINFO = message_JSON_Order.certificationProductInfo(postBackDataArray, masterProductArray)
  if(STATE_PRODUCTINFO){return message_JSON_irregular.whenOldProductInfo()}

  //口数チェック 不要
  textOrderNum = "希望口数：" + orderNumber

  //納品日チェック
  //テキスト、納品期間チェック不要
  //荷受け日、ブロック日チェック
  let AFTER_DELIVERYDAY, CHANGE_DELIVERYDAY_STATE
  if(STATE_CHECK_DELIVERYDAY == 1){    
    AFTER_DELIVERYDAY = message_JSON_Order.certificationDeliveryday(new Date(desiredDeliveryday))
    desiredDeliveryday = AFTER_DELIVERYDAY[0]
    CHANGE_DELIVERYDAY_STATE = AFTER_DELIVERYDAY[1]
    textDeliveryday = "希望市場納品日：" + timeMethod.getDisplayFmtDate(desiredDeliveryday)

    //変わったらpostBackData書き換え
    if(CHANGE_DELIVERYDAY_STATE){
      postBackData = postBackData.replace(postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday], desiredDeliveryday)
      textDeliveryday = textDeliveryday + "\n※翌競り日に変更しました"
    }
  }
  else{
    textDeliveryday = "希望市場納品日：" + timeMethod.getDisplayFmtDate(desiredDeliveryday)
  }  

  const SD_FMT_LINE = timeMethod.getDeliverydayYMD(masterProductArray[property.constPL.columns.sDeliveryday], 0)
  const ED_FMT_LINE = timeMethod.getDeliverydayYMD(masterProductArray[property.constPL.columns.eDeliveryday], 1)
    
  //メッセージ作成
  console.log(`--postBackData: ${postBackData}`)
  console.log(`--発注情報: ${textOrderNum},  ${textDeliveryday}`)
  const messagesArray = getCarouselOneOrder(
    TIMESTAMP, postBackData, postBackDataArray[postCode_JSON.postBackDataLabels.postbackCode], textOrderNum, textDeliveryday,
    CHANGE_DELIVERYDAY_STATE, masterProductArray, SD_FMT_LINE, ED_FMT_LINE, CHECK_ORDER_STATE, CHANGE_STATE
  )
  return messagesArray
}
  
//●Flex Message 発注内容確認メッセージ 単品発注用
function getCarouselOneOrder(TIMESTAMP, postBackData, postbackCode, textOrderNum, textDeliveryday, CHANGE_DELIVERYDAY_STATE, masterProductArray, SD_FMT_LINE, ED_FMT_LINE, CHECK_ORDER_STATE, CHANGE_STATE){
  //postBackdata
  const endPostCode = "--" + TIMESTAMP
  let postdataOrderNum        = postBackData.replace(postbackCode, postCode_JSON.postBackTag.instantOrder + "-" + postCode_JSON.postBackNum.instantOrder.setOrderNum + endPostCode)
  let postBackDataDeliveryDate    = postBackData.replace(postbackCode, postCode_JSON.postBackTag.instantOrder + "-" + postCode_JSON.postBackNum.instantOrder.setDeliveryday + endPostCode)
  const postBackDataOrderConfirm    = postBackData.replace(postbackCode, postCode_JSON.postBackTag.instantOrder + "-" + postCode_JSON.postBackNum.instantOrder.orderConfirm + endPostCode) 

  let textMessage = ""

  let label1 = "発注確定", postdata1 = postBackDataOrderConfirm
  let label2 = "キャンセル", postdata2 = postCode_JSON.getCancelCode(TIMESTAMP)

  //コンテンツ
  let messagesArray= []
  let bodyContents  = [], imageContents = [], footerContents = []
  imageContents = flexMessage_ForBuyer.getCardlabel(imageContents, "発注内容")  //上部ラベル  
  
  //在庫有無確認
  const stockNow = masterProductArray[property.constPL.columns.stockNow]
  if(stockNow <= 0){
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL("https://drive.google.com/uc?id=1O0Y4sc-vMYE7-5LPF0tbywHG7Owt0TKO"), imageContents))  //商品情報１  上部ラベル、完売画像、残口
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(masterProductArray)) //商品情報2   商品名～市場納品期間
    bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo("-", "-"))  //発注情報  

    //メッセージ1
    messagesArray.push(message_JSON.getflexCarouselMessage("発注内容", [flexMessage_ForBuyer.getCardForBuyer(bodyContents, footerContents)]))

    //メッセージ2
    messagesArray.push(message_JSON_irregular.whenStockNone()[0])
    return messagesArray
  }

  imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "残" + stockNow + "口")  //残口
  bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(masterProductArray[property.constPL.columns.picUrl]), imageContents))//商品情報１  上部ラベル、商品画像、残口
  bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(masterProductArray))                                                          //商品情報2   商品名～市場納品期間
  bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo(textOrderNum, textDeliveryday))  //発注情報

  //発注情報 初確認
  //console.log(`CHECK_ORDER_STATE: ${CHECK_ORDER_STATE}`)
  if(CHECK_ORDER_STATE == 0){
    //postBackDataの修正
    let breorder = "0∫on"
    let areorder = "2∫on"

    postdataOrderNum = postdataOrderNum.replace(breorder, areorder)
    postBackDataDeliveryDate = postBackDataDeliveryDate.replace(breorder, areorder)

    //メッセージ2
    textMessage += "最初は、希望口数1、最短納品可能日が指定されています。\n\n「口数」、「納品日」ボタンを押すと、それぞれ変更できます。"
  }

  //2回目以降の発注内容表示にはテキストメッセージ「最初は、～」不要
  else if(CHECK_ORDER_STATE == 2){
    //荷受け日、ブロック日を翌競り日に変更
    if(CHANGE_DELIVERYDAY_STATE){
      textMessage += "市場納品日は、希望日の翌競り日に修正させていただきました。\nご了承ください。"
    }
    //TODO: 納品期間外
  }

  //発注情報 確認済み 再発注の際は、事前に納品日を変更済み
  else if(CHECK_ORDER_STATE == 1){
      const postBackDatareOrderConfirem = postBackData.replace(postbackCode, postCode_JSON.postBackTag.instantOrder + "-" + postCode_JSON.postBackNum.instantOrder.reOrderConfirm + endPostCode)
      //console.log(`追加発注確定 ${postBackData} : ${postBackDatareOrderConfirem}`)
      label1 = "追加発注確定", postdata1 = postBackDatareOrderConfirem

    //メッセージ2
      textMessage += "上記商品は同納品日に発注済みです。\n\n再発注でしたら、上の追加発注確定ボタンを押してください。";
  }

  //footer1 
  footerContents.push(flexMessage_ForBuyer.getCardfooterBottun("口数", "口数変更", postdataOrderNum))
  footerContents.push(flexMessage_ForBuyer.getCardfooterDeliverydayBottun("納品日", postBackDataDeliveryDate, SD_FMT_LINE, ED_FMT_LINE))  

  //メッセージ0
  if(CHANGE_STATE == 1){//口数変更
    messagesArray.unshift(message_JSON.getTextMessage("口数を変更しました。"))
  }
  else if(CHANGE_STATE == 2){//納品日変更
    messagesArray.unshift(message_JSON.getTextMessage("納品日を変更しました。"))
  }

  //メッセージ1
  const explainText = "希望商品・口数・納品日を\nご確認ください。\n\n問題なければ下の\n「発注確定」ボタンを押してください。"
  messagesArray.push(message_JSON.getflexCarouselMessage("発注内容", [flexMessage_ForBuyer.getCardForBuyer(bodyContents, footerContents), flexMessage_ForBuyer.getCardOrderCertification(explainText, label1, postdata1, label2, postdata2)]))

  //メッセージ2
  if(textMessage != ""){messagesArray.push(message_JSON.getTextMessage(textMessage))}

  /* デバック
    console.log(`label1 : ${label1}`)
    console.log(`postdata1 : ${postdata1}`)
    console.log(`label2 : ${label2}`)
    console.log(`postdata2 : ${postdata2}`)
  */

  return messagesArray
}

//●発注確定 単品発注
async function orderConfirm(user, TIMESTAMP, postBackData, postBackDataArray, CHECK_ORDER_STATE, orderRecords){
  console.log("")
  //●メッセージ作成・送信
  let messagesArray= []

  //●前処理
  //前処理 固有 商品リストと照合するための情報準備
  //posaBackData 抽出
  const sheetId = postBackDataArray[postCode_JSON.postBackDataLabels.sheetId]
  const pId = postBackDataArray[postCode_JSON.postBackDataLabels.productId]
  const orderNum = postBackDataArray[postCode_JSON.postBackDataLabels.orderNum].replace("on","");//希望口数    
  const deliveryday = postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday];//希望市場納品日 yyyy-mm-dd

  //posaBackDataからスプレッドシートの情報を取得
  const plSheet= new Products(user.SSIDS.spSheetId1, sheetId)
  plSheet.SSIDS = user.SSIDS
  const masterProductArray = await plSheet.getRowData(pId)
  //console.log(`masterProductArray : ${masterProductArray}`)
  //TODO: スプレッドシートの情報を取得できなかったときの対処
  if(masterProductArray == undefined){
    console.log(`商品マスタ情報に問題があります。`)
    console.log(`シートID : ${sheetId} 商品ID : ${pId}  商品マスタ情報：${masterProductArray}`)
  }
  const STOCKNOW = masterProductArray[property.constPL.columns.stockNow]
  //const upState = masterProductArray[property.constPL.columns.upState]  単品発注できる時点で掲載中なので不要

  //console.log(postBackDataArray[postCode_JSON.postBackDataLabels.name])          
  
  //商品情報確認
  const STATE_PRODUCTINFO = message_JSON_Order.certificationProductInfo(postBackDataArray, masterProductArray)

  //発注不可条件
  //在庫<0、または商品情報が異なる
  if(STOCKNOW <= 0){return [message_JSON.getTextMessage(message_JSON_irregular.whenStockNone())]}
  else if(STATE_PRODUCTINFO){return [message_JSON.getTextMessage(message_JSON_irregular.whenOldProductInfo())]}

  //納品日確認 不要
  //新規発注データ準備            
  //新規発注情報配列（スプレッドシート格納用）
  const orderDataArray = orderRecords.getOrderArray(TIMESTAMP, sheetId, masterProductArray, orderNum, deliveryday)
  
  //再発注伺い 条件
  //新規発注、かつ発注履歴有、かつ各発注履歴について、発注しようとしている情報との重複がある → 再発注
  if(CHECK_ORDER_STATE != 1 && orderRecords.recordNum > 0 && orderRecords.certificateOrderRecord(masterProductArray, deliveryday, false)){
    console.log(`再発注伺い`)
    const BEFORE_ORDER_STATE = CHECK_ORDER_STATE
    const AFTER_ORDER_STATE = 1
    postBackData = postBackData.replace(BEFORE_ORDER_STATE + "∫on", AFTER_ORDER_STATE + "∫on")
    console.log(`postBackData: ${postBackData}`)
    postBackDataArray = postBackData.split("∫")
    messagesArray = await module.exports.getCarouselOneOrderCeritification(user, TIMESTAMP, postBackData, postBackDataArray, AFTER_ORDER_STATE, postBackDataArray[postCode_JSON.postBackDataLabels.orderNum], deliveryday, 0, 0)
  }
  
  //発注履歴なし
  //発注履歴あり、かつ各発注履歴について、発注しようとしている情報との重複がない
  //再発注伺い済み
  else{
    console.log(`新規発注情報 登録`)
    //発注完了メッセージ
    const TEXT_ORDERINFO = "●" + postBackDataArray[postCode_JSON.postBackDataLabels.name] + postBackDataArray[postCode_JSON.postBackDataLabels.norm] +
      "\n希望口数:" + orderNum + "\n希望納品日:" + timeMethod.getDisplayFmtDate(deliveryday)
    const STATE_ORDERHIS = [1, [TEXT_ORDERINFO]]
    const STATE_REORDER = false //再発注:true, 再発注でない:false

    messagesArray = await message_JSON_Order.replyOrderConfirmTextMessage(STATE_ORDERHIS, STATE_REORDER, user, TIMESTAMP);

    //発注履歴挿入
    await orderRecords.insertOrderRecord([orderDataArray])

    //在庫管理
    await plSheet.setNewStock(pId, STOCKNOW, orderNum)
    plSheet.sheet.saveUpdatedCells(); // save all updates in one call
  }
  return messagesArray
}

module.exports = {
  getCarouselOneOrderCeritification,
  orderConfirm,  
}