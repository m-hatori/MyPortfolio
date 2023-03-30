//単品発注/複数発注併用 メソッド群
//TODO: スキップ certification と check の混合解消

/* eslint-disable one-var */
const property = require("../property.js");
const timeMethod = require("../getTime.js");
const { utcToZonedTime } = require('date-fns-tz')

const Products = require("../class ProductsList.js");

const action_JSON = require("./Action_JSON.js");
const Irregular = require("./Irregular.js");

//●商品情報取得
module.exports.getProductsInfo = (postBackData) => {
  //同一商品IDの商品情報を抽出
  const plSheet = new Products(postBackData.product.sheetId) 
  const masterProductArray = plSheet.plSheetVals[Number(postBackData.product.productId)]
  //console.log(`masterProductArray : ${JSON.stringify(masterProductArray)}`)
  if(masterProductArray === undefined){
    console.log(`商品マスタ情報に問題があります。`)
    console.log(`シートID : ${postBackData.product.sheetId} 商品ID : ${postBackData.product.productId}`)
  }
  return [plSheet, masterProductArray]
}

//●希望口数伺い
module.exports.selectOrderNum = (postBackData) => {
  let messagesArray = [], items = []

  //商品情報 現在庫取得
  const [plSheet, masterProductArray] = module.exports.getProductsInfo(postBackData)
  
  //在庫確認
  const stockNow = masterProductArray[property.constPL.columns.stockNow]
  if(stockNow == 0){return Irregular.whenStockNone()}

  //最大発注可能数
  let maxOrderNum = 10
  if(stockNow < maxOrderNum ){maxOrderNum = stockNow}

  //●メッセージ作成・送信
  postBackData.command = "setOrderNum"
  for(var i = 0; i <= maxOrderNum; i++){
    if(i == 0){
      items.push({
        "type": "action",
        "action": action_JSON.getPostbackActionWithText(
          "キャンセル",
          JSON.stringify({tag: "cancel"}),
          "キャンセル"
        )
      });
    }
    else{
      postBackData.newOrderNum =  i //newOrderNumを追記
      items.push({
        "type": "action",
        "action": action_JSON.getPostbackActionWithText(i, postBackData,  `${i}口`)              
      });
    }
  }
  
  messagesArray.push(
    {
      "type": "text",
      "text": "口数を指定くださいませ↓",
      "quickReply": {
        "items": items,
      },
    }
  ); 
  return messagesArray
}


//●商品情報チェック
//商品リストと一致するか照合
//比較対象：商品名、出荷者、サイズ入数販売単価
module.exports.certificationProductInfo = (postBackData, masterProductArray) => {
  //console.log(`照合 postBackData - SS情報`)
  const mData = getTextbyMasterData(masterProductArray)
  const pData = getTextbyPostData(postBackData)      
  
  //商品情報がリストと一致しないとき、または未掲載のとき
  if(mData != pData || masterProductArray[property.constPL.columns.upState] === false){
    console.log(`--商品リストとpostBackDataを照合 不一致,または未掲載`)
    console.log(`--mData : ${mData}`)
    console.log(`--pData : ${pData}`)
    console.log(`--upState : ${masterProductArray[property.constPL.columns.upState]}`)
    
    return true
  }
  else{
    //console.log(`--商品リストとpostBackDataを照合 一致`)
    return false
  }
}

//●商品情報 スプレッドシート情報 照合用テキスト取得
const getTextbyMasterData = (masterProductArray) => {
  return masterProductArray[property.constPL.columns.numA] + "-" + masterProductArray[property.constPL.columns.numB] +
    //masterProductArray[property.constPL.columns.name].replace(/\n/g, "") +
    masterProductArray[property.constPL.columns.name] +
    masterProductArray[property.constPL.columns.norm]
}

//●商品情報 postBackData 照合用テキスト取得
const getTextbyPostData = (postBackData) => {
  return postBackData.product.producer.split(" ")[0] +
  postBackData.product.name + postBackData.product.norm
}

//●希望納品日 yyyy-MM-DD → unixTime
module.exports.getUnixTimeFMDeliveryday = (deliveryday) => {
  const newDeliveryday = utcToZonedTime(new Date(deliveryday), timeMethod.TIMEZONE)
  const newDeliveryday_uxniTime = newDeliveryday.getTime()
  console.log(`--希望納品日: ${newDeliveryday}  unixTime: ${newDeliveryday_uxniTime}`)
  return newDeliveryday_uxniTime
}

//●希望納品日 テキストチェック deliveryday:yyyy-mm-dd or text
module.exports.chechkTextDeliveryday = (deliveryday) => {
  //Dateか否か
  if(isNaN(new Date(deliveryday))){
    console.log(`--納品日 テキスト`)
    return [true, deliveryday]
  }
  else{
    console.log(`--納品日 テキストでない`)
    return [false, deliveryday]
  }
}