/* eslint-disable one-var */
const property = require("./property.js");
const timeMethod = require("./getTime.js");

const SpreadSheet_API = require("./npm API/SpreadSheet_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const flexMessage_ForBuyer = require("./LINE_Messaging_API/Flex Message Parts For Buyer.js");
const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");

//●オブジェクト：シートレベル//
//ここではシート内のあるuserIdを検索し、すべてのセルを取得する。セルの数＝発注履歴の件数となる。
//子クラスのOrderRecordにて、各発注履歴の情報を取得する。

  /*
  発注履歴でやりたいこと
  ・あるユーザーのある商品（出荷者～市場納品日）の発注履歴の有無を「確認」 return ture or false
  ・あるユーザーの発注履歴の一覧取得 return Datas
 
  発注履歴のパターン
  ・発注履歴がある cells.length>0
   ・発注履歴はあるが、新たに発注しようとしている履歴がある cells.length>0 & orderData == listdata return true
   ・発注履歴はあるが、新たに発注しようとしている履歴がない cells.length>0 & orderData != listdata return false
  ・発注履歴がない cells.length<0allUserOrderData

  処理フロー
  セル位置全取得→各セル位置の発注履歴を取得→各発注履歴について、発注しようとしている情報との重複がないか確認→セル位置を返す。もしくはtrue or false
  */


class OrderRecords{
  // プロパティを追加する
  constructor(user) {    
    //スプレッドシート 発注リスト パラメータ
    this.sheetId = 0  //シートID 固定
    this.vals

    //スプレッドシート 発注リスト ユーザーパラメータ
    this.user = user
    this.orderRecordsOfUser = [] //ユーザー個別の発注履歴配列
    this.recordNum  //ユーザー個別に発注履歴件数
    this.ordersArrayForcheck  //ユーザー個別の発注履歴照合用テキスト配列    
  }

  //任意ユーザーの発注履歴を取得 
  //firestore
  /*
  async getUserOrderData(){
    this.orderRecordsOfUser = this.user.order
    this.recordNum = this.orderRecordsOfUser.length
    //console.log(this.orderRecordsOfUser)
    console.log(`--ユーザー個別発注件数 : ${this.recordNum}`)
  }
  */
  //SpreadSheet
  ///*
  async getUserOrderData(){
    this.vals = await SpreadSheet_API.getOrderList(false)
    
    //任意ユーザーの発注全情報    
    for(let buff of this.vals){
      //console.log(`${JSON.stringify(buff._rawData)}`)
      //console.log(`${buff._rawData[property.constOL.columns.MARKET_ID]}-${buff._rawData[property.constOL.columns.BRANCH_NUM]}`)
      if( Number(buff._rawData[property.constOL.columns.MARKET_ID]) == this.user.property.MARKET_ID &&
          Number(buff._rawData[property.constOL.columns.BRANCH_NUM]) == this.user.property.BRANCH_NUM
      ){
        this.orderRecordsOfUser.push(buff)
      }
    }
    this.recordNum = this.orderRecordsOfUser.length
    //console.log(this.orderRecordsOfUser)
    console.log(`--ユーザー個別発注件数 : ${this.recordNum}`)
  }
  //*/

  //タイムスタンプと商品名が同一の発注履歴があるか確認
  //商品名が同じで、規格違い、または出荷者違いのものもブロックしてしまう。。。。 → 同様の商品を発注しないようにするにはいいかも。
  async checkOrderRecordTimeStamp(TIMESTAMP, NEW_PRODUCT_NAME){
    TIMESTAMP = Math.floor(TIMESTAMP/1000) //unixTime(sec)
    console.log(`--新規発注日時: ${TIMESTAMP}, 新規発注商品名: ${NEW_PRODUCT_NAME}`)

    let unixTimeOrderday
    for(let buff of this.orderRecordsOfUser){
      const ORDERED_PRODUCT_NAME = buff._rawData[property.constOL.columns.prductName]
      const ORDERED_DAY = buff._rawData[property.constOL.columns.orderday]
      unixTimeOrderday = timeMethod.getDateFMOrderDay(ORDERED_DAY).getTime()/1000 //unixTime(sec)
      console.log(`--過去発注日時: ${ORDERED_DAY}(${unixTimeOrderday}), 過去発注商品名: ${ORDERED_PRODUCT_NAME}`)

      //発注日時と商品名が重複するか確認
      if(unixTimeOrderday == TIMESTAMP && ORDERED_PRODUCT_NAME == NEW_PRODUCT_NAME){
        console.log("発注済み確認: 済")
        return true
      }
    }    
    console.log("発注済み確認: 未")
    return false;
  }

  //●発注履歴メッセージ取得
  async getAllOrderRecords(){

    const messagesArray = [], columns1 = [], columns2 = [], columns3 = []
    const maxRecord = 30
    if(this.recordNum == 0){
      const textMessage = "現在、発注履歴はありません。"
      messagesArray.push(message_JSON.getTextMessage(textMessage))
      messagesArray.push(new StampMessage().何卒)
    }
    else{
      //最大表実数を制限
      if(this.recordNum > maxRecord){this.recordNum = maxRecord}

      //発注履歴カルーセル作成
      let pNum
      for(pNum = 0; pNum < this.recordNum; pNum++){
        const orderArray = this.orderRecordsOfUser[pNum]._rawData
        const orderDate = "発注日時:" + orderArray[property.constOL.columns.orderday]
        const productName = orderArray[property.constOL.columns.prductName]
        const norm = orderArray[property.constOL.columns.size] + orderArray[property.constOL.columns.sizeUnit] + orderArray[property.constOL.columns.quantityPerCase] +
          "入 ｜単価" + orderArray[property.constOL.columns.sellingPrice] + "円"
        const producerInfo = orderArray[property.constOL.columns.pnumA] + "-" + orderArray[property.constOL.columns.pnumB] + " " + orderArray[property.constOL.columns.producerName]
        const stateOrderNum    = "希望口数：" + orderArray[property.constOL.columns.orderNum]
        const stateDeliveryday = "希望市場納品日：" + orderArray[property.constOL.columns.deliveryday] //'yy/mm/dd(day)
        /* デバック
        console.log(`${norm}`)
        console.log(`${producerInfo}`)
        console.log(`${stateOrderNum}`)
        console.log(`${stateDeliveryday}`)
        */
        const card = flexMessage_ForBuyer.getOrderRecordCard(orderDate, productName, norm, producerInfo, stateOrderNum, stateDeliveryday)

        //columnsに情報を格納する
        if(pNum <= 10){ columns1.push(card) }
        else if(pNum <= 20){ columns2.push(card) }            
        else{ columns3.push(card) }            
      }

      //メッセージ格納      
      messagesArray.push(message_JSON.getflexCarouselMessage("発注履歴part1",columns1))//メッセージ1
      if(pNum > 10){messagesArray.push(message_JSON.getflexCarouselMessage("発注履歴part2",columns2))}//メッセージ2      
      if(pNum > 20){messagesArray.push(message_JSON.getflexCarouselMessage("発注履歴part3",columns3))}//メッセージ3
      messagesArray.push(message_JSON.getTextMessage("買参人コード" + this.user.property.MARKET_ID + "-" + this.user.property.BRANCH_NUM + "様\n直近30日の発注履歴を表示しました。"))//メッセージ4
    }
    return messagesArray
  }

  //●発注履歴の照合
  //productInfoArray: []
  //deliveryday: YYYY-MM-DD
  async checkNewOrderisOrdered(productInfoArray, deliveryday){
    console.log(`--発注済み確認`)
    //発注履歴比較用 新規発注データ
    const newOrder = this.getNewOrderForcheck(productInfoArray, deliveryday)
    console.log(`---今回の発注 ${newOrder}`)

    //発注履歴比較用 過去発注全データ    
    if(this.ordersArrayForcheck === undefined){ this.ordersArrayForcheck = this.getOrdersArrayForcheck(); }
    for (let buff of this.ordersArrayForcheck){      
      console.log(`---発注の履歴 ${buff}`)
      if(newOrder === buff){
        console.log(`----一致あり`)
        return true;
      }
    }
    //発注しようとしている情報と同じ発注履歴が１つもない
    console.log(`----一致なし`)
    return false;
  }

  //発注履歴照合用文字列を全取得
  //新規発注情報が 発注済みでないか比較するため
  getOrdersArrayForcheck(){    
    const orderRecordsArray = []
    for (let buff of this.orderRecordsOfUser){
      orderRecordsArray.push(this.getOrderForcheck(buff._rawData));
    }
    return orderRecordsArray
  }

  //発注ダブりチェック用文字列 過去発注情報
  getOrderForcheck(orderDataArray){
    //"希望市場納品日"	("出荷者親番号"	"出荷者枝番号" 商品名	サイズ	単位	入数	仕入単価 販売単価)
    return orderDataArray[property.constOL.columns.deliveryday] +
      orderDataArray[property.constOL.columns.pnumA] + orderDataArray[property.constOL.columns.pnumB] +
      orderDataArray[property.constOL.columns.prductName] +
      orderDataArray[property.constOL.columns.size] +
      orderDataArray[property.constOL.columns.sizeUnit] +
      orderDataArray[property.constOL.columns.quantityPerCase] +
      orderDataArray[property.constOL.columns.purchasePrice] +
      orderDataArray[property.constOL.columns.sellingPrice]
  }

  //発注ダブりチェック用文字列 商品リスト商品情報
  //deliveryday: YYYY-MM-DD
  getNewOrderForcheck(productInfoArray, deliveryday){
    return  timeMethod.getDateFmt(deliveryday, "orderList_deliveryday") + productInfoArray[property.constPL.columns.numA] + productInfoArray[property.constPL.columns.numB] +
      productInfoArray[property.constPL.columns.name] +
      productInfoArray[property.constPL.columns.size] +
      productInfoArray[property.constPL.columns.sizeUnit] +
      productInfoArray[property.constPL.columns.quantityPerCase] +
      productInfoArray[property.constPL.columns.purchasePrice] +
      productInfoArray[property.constPL.columns.sellingPrice];
  }
    
  //●新規発注
  //1商品 新規発注情報配列作成
  getOrderArray(TIMESTAMP, postBackData, productInfoArray, desiredDeliveryday){
    //新規発注情報
    // 発注日時	"希望市場納品日"	"買参人親番号"	"買参人枝番号"	買参人名
    //"JANコード（将来用）"	商品ID	"産地担当"	"出荷者親番号"	"出荷者枝番号"	出荷者名	"商品マスタコード"	商品名	サイズ	単位	入数 "希望口数"	"仕入単価"	"販売単価"  
    const ORDER_TIME = timeMethod.getDateFmt(TIMESTAMP, "orderList_orderDay")
    return [
      ORDER_TIME, desiredDeliveryday, this.user.property.MARKET_ID, this.user.property.BRANCH_NUM, this.user.property.BUYER_NAME,
      "",//JANコード 予定
      `${property.sheetNumber[postBackData.product.sheetId]}-${productInfoArray[property.constPL.columns.productId]}`,
      productInfoArray[property.constPL.columns.salesStaffName],
      productInfoArray[property.constPL.columns.numA],
      productInfoArray[property.constPL.columns.numB],
      productInfoArray[property.constPL.columns.producerName],
      productInfoArray[property.constPL.columns.productCode],
      productInfoArray[property.constPL.columns.name],
      productInfoArray[property.constPL.columns.size],
      productInfoArray[property.constPL.columns.sizeUnit],
      productInfoArray[property.constPL.columns.quantityPerCase],
      postBackData.product.orderNum,      
      productInfoArray[property.constPL.columns.purchasePrice],
      productInfoArray[property.constPL.columns.sellingPrice],
    ]
  }
}
module.exports = OrderRecords