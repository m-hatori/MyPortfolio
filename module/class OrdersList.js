/* eslint-disable one-var */
const property = require("./property.js");
const timeMethod = require("./getTime.js");

const Firestore_API = require("./npm API/FireStore_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const flexMessage_ForBuyer = require("./LINE_Messaging_API/Flex Message Parts For Buyer.js");
const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");

//●オブジェクト：シートレベル//
class OrderRecords{
  // プロパティを追加する
  constructor(user) {    
    //スプレッドシート 発注リスト パラメータ
    this.sheetId = 0  //シートID 固定

    //firestore 発注情報 ユーザーパラメータ
    this.user = user
    this.orderRecordsOfUser = []
    this.recordNum = 0
    this.ordersArrayForcheck  //ユーザー個別の発注履歴照合用テキスト配列
  }

  async getDB(){
    const dbData = await Firestore_API.accessFirestore("getDB")
    if(dbData.order[this.user.ID] !== undefined && dbData.order[this.user.ID] !== null){
      for(let i in dbData.order[this.user.ID]){
        this.orderRecordsOfUser.push(JSON.parse(dbData.order[this.user.ID][i])) //ユーザー個別の発注履歴配列
      }
      this.recordNum = this.orderRecordsOfUser.length //ユーザー個別に発注履歴件数
      console.log(`--ユーザー個別発注件数 : ${this.recordNum}`)
    }
  }

  //●発注履歴メッセージ取得
  async getAllOrderRecords(){
    if(this.orderRecordsOfUser == []){await this.getDB()}

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
        const orderArray = this.orderRecordsOfUser[pNum]
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
      messagesArray.push(message_JSON.getTextMessage("買参人コード" + this.user.property.MARKET_ID + "-" + this.user.property.BRANCH_NUM + "様\n直近の発注履歴を表示しました。\n※最大30件"))//メッセージ4
    }
    return messagesArray
  }

  //●発注履歴の照合  
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

  //productInfoArray: []
  //deliveryday: YYYY-MM-DD
  //発注ダブりチェック用文字列 過去発注情報
  getOrderForcheck(orderArray){
    //"希望市場納品日"	("出荷者親番号"	"出荷者枝番号" 商品名	サイズ	単位	入数	仕入単価 販売単価)
    return orderArray[property.constOL.columns.deliveryday] +
      orderArray[property.constOL.columns.pnumA] + orderArray[property.constOL.columns.pnumB] +
      orderArray[property.constOL.columns.prductName] +
      orderArray[property.constOL.columns.size] +
      orderArray[property.constOL.columns.sizeUnit] +
      orderArray[property.constOL.columns.quantityPerCase] +
      orderArray[property.constOL.columns.purchasePrice] +
      orderArray[property.constOL.columns.sellingPrice]
  }

  //発注履歴照合用文字列を全取得
  //新規発注情報が 発注済みでないか比較するため
  getOrdersArrayForcheck(){    
    const orderRecordsArray = []
    for (let buff of this.orderRecordsOfUser){
      orderRecordsArray.push(this.getOrderForcheck(buff));
    }
    return orderRecordsArray
  }

  //発注確定ボタン 2度押し確認
  async checkOrderRecordTimeStamp(postBackData_timeStamp, productName){
    console.log(`--発注確定ボタン 2度押し確認`)
    //console.log(`---unixTime: ${postBackData_timeStamp} msec`)

    const _postBackData_timeStamp = Math.floor(postBackData_timeStamp/1000) //unixTime(sec) msecは過去情報と比較できないためカットする。    
    const ORDERDATE = new Date(postBackData_timeStamp)
    console.log(`---今回: ${ORDERDATE}(${_postBackData_timeStamp}sec)`)
    
    let ORDEREDDATE, PRODUCTNAME, UNIXTIME_ORDEREDDATE
    for(let buff of this.orderRecordsOfUser){
      ORDEREDDATE = buff[property.constOL.columns.orderday]
      PRODUCTNAME = buff[property.constOL.columns.prductName]
      ORDEREDDATE = new Date(ORDEREDDATE)

      UNIXTIME_ORDEREDDATE = ORDEREDDATE.getTime()/1000 //unixTime(sec)
      UNIXTIME_ORDEREDDATE = UNIXTIME_ORDEREDDATE - 9*60*60 
      //タイムスタンプはGMT+0で時刻が生成される。
      //発注情報に書き込むときは、日本時刻(GMT+9)に変換し書き込まれる。
      //したがって比較するときは、発注情報をGMT+0に変換(9時間分マイナス)する。
      
      console.log(`---過去: ${ORDEREDDATE}(${UNIXTIME_ORDEREDDATE}sec)`)

      //発注日時と商品名が重複するか確認
      if(UNIXTIME_ORDEREDDATE == _postBackData_timeStamp &&  PRODUCTNAME == productName){
        console.log("--発注確定ボタン 2度押し")
        return true
      }
    }
    return false;
  }

  //商品と納品日の重複確認
  async checkNewOrderisOrdered(productInfoArray, deliveryday){
    if(this.orderRecordsOfUser === undefined){await this.getDB()}

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

    
  //●新規発注
  //1商品 新規発注情報配列作成
  getOrderArray(TIMESTAMP, postBackData, productInfoArray, desiredDeliveryday){
    //新規発注情報
    // 発注日時	"希望市場納品日"	"買参人親番号"	"買参人枝番号"	買参人名
    //"JANコード（将来用）"	商品ID	"産地担当"	"出荷者親番号"	"出荷者枝番号"	出荷者名	"商品マスタコード"	商品名	サイズ	単位	入数 "希望口数"	"仕入単価"	"販売単価"  
    const ORDER_TIME = timeMethod.getDateFmt(TIMESTAMP, "orderList_orderDay")
    return [
      ORDER_TIME, desiredDeliveryday, this.user.property.MARKET_ID, this.user.property.BRANCH_NUM, this.user.property.BUYER_NAME,
      "",//JANコード 未使用
      `${property.sheetNumber[postBackData.product.sheetId]}-` + (`00${productInfoArray[property.constPL.columns.productId]}`).slice(-2),
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