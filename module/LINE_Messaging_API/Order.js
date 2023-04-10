//単品発注/複数発注併用 メソッド群

/* eslint-disable one-var */
const property = require("../property.js");
const timeMethod = require("../getTime.js");
const { utcToZonedTime } = require('date-fns-tz')

const Products = require("../class ProductsList.js");

const action_JSON = require("./Action_JSON.js");
const Irregular = require("./Irregular.js");

//●商品情報取得
module.exports.getProductsInfo = async (postBackData) => {
  //同一商品IDの商品情報を抽出
  const plSheet = new Products(postBackData.product.sheetId) 
  const productInfoArray = plSheet.plSheetVals[postBackData.product.productId]
  //console.log(`productInfoArray: ${JSON.stringify(productInfoArray)}`)
  if(productInfoArray === undefined){
    console.log(`シートID : ${postBackData.product.sheetId} 商品ID : ${postBackData.product.productId}`)
    throw new Error("商品マスタ情報に問題があります。")
  }
  else{
    //console.log(`--return plSheet`)
    return [plSheet, await productInfoArray]
  }  
}

//●希望口数伺い
module.exports.selectOrderNum = (postBackData) => {
  let messagesArray = [], items = []

  //商品情報 現在庫取得
  const [plSheet, productInfoArray] = module.exports.getProductsInfo(postBackData)
  
  //在庫確認
  const stockNow = productInfoArray[property.constPL.columns.stockNow]
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

//●希望納品日 yyyy-MM-DD → unixTime
module.exports.getUnixTimeFMDeliveryday = (deliveryday) => {
  const newDeliveryday = utcToZonedTime(new Date(deliveryday), timeMethod.TIMEZONE)
  const newDeliveryday_uxniTime = newDeliveryday.getTime()
  console.log(`--希望納品日: ${newDeliveryday}  unixTime: ${newDeliveryday_uxniTime}`)
  return newDeliveryday_uxniTime
}

//●希望納品日 テキストチェック deliveryday:yyyy-mm-dd or unixTime or text
module.exports.chechkTextDeliveryday = (deliveryday) => {
  //Dateか否か
  if(isNaN(new Date(deliveryday))){
    console.log(`---納品日 String`)
    return [true, deliveryday]
  }
  else{
    console.log(`---納品日 unixTime`)
    return [false, deliveryday]
  }
}