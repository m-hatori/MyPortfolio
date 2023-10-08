//単品発注/複数発注併用 メソッド群

/* eslint-disable one-var */
const property = require("../property.js");

const Products = require("../class ProductsList.js");

const action_JSON = require("./Action_JSON.js");
const Irregular = require("./Irregular.js");

const FireStore_API = require("./module/npm API/FireStore_API.js");
const SpreadSheet_API = require("./module/npm API/SpreadSheet_API.js");


//●商品情報取得
module.exports.getProductsInfo = async (postBackData) => {
  //同一商品IDの商品情報を抽出
  const plSheet = new Products(postBackData.product.sheetId) 
  await plSheet.getDB()
  const productInfoArray = await plSheet.plSheetVals[postBackData.product.productId]
  console.log(`productInfoArray: ${JSON.stringify(productInfoArray)}`)

  if(productInfoArray === undefined){
    console.log(`シートID : ${postBackData.product.sheetId} 商品ID : ${postBackData.product.productId}`)
    throw new Error("商品マスタ情報に問題があります。")
  }
  else{
    return [plSheet, productInfoArray]
  }  
}

//●希望口数伺い
module.exports.selectOrderNum = async (postBackData) => {
  const messagesArray = [], items = []

  //商品情報 現在庫取得
  const [plSheet, productInfoArray] = await module.exports.getProductsInfo(postBackData)
  console.log(`productInfoArray: ${JSON.stringify(productInfoArray)}`)

  //在庫確認
  const stockNow = productInfoArray[property.constPL.columns.stockNow]
  console.log(`stockNow: ${stockNow}`)
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
  
  //console.log(`items: ${JSON.stringify(items)}`)

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
  const newDate = new Date(deliveryday)
    
  //UTC時刻にして納品期間確認に備える
  const newDeliveryday_uxniTime = newDate.getTime() - 9*60*60*1000//日本時刻9時間分を引く  
  
  console.log(`---希望納品日: ${newDate}  unixTime: ${newDeliveryday_uxniTime}`)
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

//発注情報 書き込み
module.exports.setOrderInfo = async (event, messagesArray, user, orderArrays, plSheets) => {  
  await user.httpsRequest.replyMessageByAxios(event, messagesArray)

  if(orderArrays.length > 0 && user.ID != "" && plSheets !== null){
    //在庫更新
    await FireStore_API.accessFirestore("setNewStock", "", plSheets);
    
    //新規発注情報追加
    await FireStore_API.accessFirestore("insertOrder", "", "", user.ID, orderArrays);
    
    //商品リスト 在庫更新
    await SpreadSheet_API.accessProductsList("setNewStock", "", plSheets, dbData);

    //発注リスト 新規発注情報追加
    await SpreadSheet_API.accessOrderList("insertOrder", orderArrays, dbData);
  }
}