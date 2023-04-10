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
    this.SSID = user.SECRETS.spSheetId3
    this.document
    this.sheetId = 0  //シートID 固定
    this.sheet = SpreadSheet_API.dbSS_OrderList.sheet[this.sheetId]
    this.sheetData = SpreadSheet_API.dbSS_OrderList.vals[this.sheetId]

    //スプレッドシート 発注リスト ユーザーパラメータ
    this.user = user
    this.sheetDataOfTheUser = [] //ユーザーの発注履歴配列
    this.ordersArrayForcheck  //ユーザの発注履歴照合用テキスト配列
    
    //属性と列
    this.columns = {
      "orderday":0,//発注日時
      "deliveryday":1,//希望市場納品日
      "MARKET_ID":2,//買参人コード
      "BRANCH_NUM":3,//買参人枝番号
      "buyerName":4,//買参人名称
      "janCode":5,//JANコード
      "pId":6,//商品ID
      "salesPerson":7,//産地担当
      "pnumA":8,//出荷者親番号
      "pnumB":9,//出荷者枝番号
      "producerName":10,//出荷者名
      "prductCode":11,//商品マスタコード
      "prductName":12,//商品名
      "size":13,//サイズ
      "sizeUnit":14,//サイズ単位
      "quantityPerCase":15,//入数
      "orderNum":16,//希望口数
      "purchasePrice":17,//単価
      "sellingPrice":18,//単価
      "systemInputOrderNow":19,//受注入力中
      "systemInputOrder":20,//受注入力済
      "log":21,//ログ
    }

    //列数
    this.colNum = 22

    //発注情報列数
    this.orderColNum = 19

    //データ範囲
    this.sRow = 0
    this.eRow
    this.sColumn = 1
    this.eColumn = 22

    //行数
    this.rowNum
  }

  //任意ユーザーの発注履歴を取得
  async getUserOrderData(){
    //発注情報取得 保険
    if(this.sheetData === null || this.sheetData === undefined){
      await SpreadSheet_API.upDateSpreadSheet_OrderList()
      this.sheet = SpreadSheet_API.dbSS_OrderList.sheet[this.sheetId]
      this.sheetData = SpreadSheet_API.dbSS_OrderList.vals[this.sheetId]
    }

    //任意ユーザーの発注全情報
    for(let buff of this.sheetData){
      if(buff._rawData[this.columns.MARKET_ID] == this.user.property.MARKET_ID && buff._rawData[this.columns.BRANCH_NUM] == this.user.property.BRANCH_NUM){
        this.sheetDataOfTheUser.push(buff)
      }
    }
    this.recordNum = this.sheetDataOfTheUser.length
    //console.log(this.sheetDataOfTheUser)
    console.log(`--ユーザー個別発注件数 : ${this.recordNum}`)
  }

  //タイムスタンプと商品名が同一の発注履歴があるか確認
  //商品名が同じで、規格違い、または出荷者違いのものもブロックしてしまう。。。。 → 同様の商品を発注しないようにするにはいいかも。
  async checkOrderRecordTimeStamp(TIMESTAMP, NEW_PRODUCT_NAME){
    TIMESTAMP = Math.floor(TIMESTAMP/1000) //unixTime(sec)
    console.log(`--新規発注日時: ${TIMESTAMP}, 新規発注商品名: ${NEW_PRODUCT_NAME}`)

    let unixTimeOrderday
    for(let buff of this.sheetDataOfTheUser){
      const ORDERED_PRODUCT_NAME = buff._rawData[this.columns.prductName]
      const ORDERED_DAY = buff._rawData[this.columns.orderday]
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
        const orderArray = this.sheetDataOfTheUser[pNum]._rawData
        const orderDate = "発注日時:" + orderArray[this.columns.orderday]
        const productName = orderArray[this.columns.prductName]
        const norm = orderArray[this.columns.size] + orderArray[this.columns.sizeUnit] + orderArray[this.columns.quantityPerCase] +
          "入 ｜単価" + orderArray[this.columns.sellingPrice] + "円"
        const producerInfo = orderArray[this.columns.pnumA] + "-" + orderArray[this.columns.pnumB] + " " + orderArray[this.columns.producerName]
        const stateOrderNum    = "希望口数：" + orderArray[this.columns.orderNum]
        const stateDeliveryday = "希望市場納品日：" + orderArray[this.columns.deliveryday] //'yy/mm/dd(day)
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
    for (let buff of this.sheetDataOfTheUser){
      orderRecordsArray.push(this.getOrderForcheck(buff._rawData));
    }
    return orderRecordsArray
  }

  //発注ダブりチェック用文字列 過去発注情報
  getOrderForcheck(orderDataArray){
    //"希望市場納品日"	("出荷者親番号"	"出荷者枝番号" 商品名	サイズ	単位	入数	仕入単価 販売単価)
    return orderDataArray[this.columns.deliveryday] +
      orderDataArray[this.columns.pnumA] + orderDataArray[this.columns.pnumB] +
      orderDataArray[this.columns.prductName] +
      orderDataArray[this.columns.size] +
      orderDataArray[this.columns.sizeUnit] +
      orderDataArray[this.columns.quantityPerCase] +
      orderDataArray[this.columns.purchasePrice] +
      orderDataArray[this.columns.sellingPrice]
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

  //発注挿入
  /*
  //課題
    発注が複数あるとき、保存は一括で行いたい→検討中
    スプレッドシートの体裁を操作できない→すべての発注情報をアーカイブしてしまったとき問題となる。
  */
  async insertOrderRecord(ordersArray){
    const STARTINDEX = this.sRow + 1 //挿入始端行 0(1行目), 1(2行目), 2(3行目)....
    const ENDINDEX = ordersArray.length + STARTINDEX  //挿入終端行 挿入始端行＋挿入行数
    console.log(`-発注リストへ登録 挿入始端行 : ${STARTINDEX}   挿入終端行 : ${ENDINDEX}`)
    
    //let inputRange = SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.orderday, numRows, this.orderColNum)

    //TODO: 体裁変更
    /*
    if(this.eRow <= this.sRow){
      //空白行挿入
      SpreadSheet_API.dbSS_OrderList.sheet[0].insertRowsAfter(this.sRow - 1, numRows)

      let allRange = SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.orderday, numRows, this.eColumn)

      //枠線追加
      allRange.setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);

      //背景色リセット
      allRange.setBackground(null)
      
      //書式設定
      let fontsize = [
        [10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 10]
      ];
      let dayformat = [
        ['"’"yy"/"MM"/"dd" "HH":"mm":"ss' ,'"’"yy"/"MM"/"dd"("ddd")"']
      ];

      for(var i = 0; i < numRows - 1; i++){
        fontsize.push(fontsize[0])
        dayformat.push(dayformat[0])
      }
      
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.orderday, numRows, this.eColumn).setFontSizes(fontsize)
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.orderday, numRows, 2).setNumberFormats(dayformat)
      

      //チェックボックス挿入
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.systemInputOrderNow, numRows, 1).insertCheckboxes()
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.systemInputOrder, numRows, 1).insertCheckboxes()

      //すべて中央寄せ
      allRange.setHorizontalAlignment('center')//中央寄せ

      //発注日時～販売単価まですべて右寄せ
      inputRange.setHorizontalAlignment('right')//右寄せ

      //個別に左寄せ
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.buyerName, numRows, 1).setHorizontalAlignment('left')//左寄せ
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.salesPerson, numRows, 1).setHorizontalAlignment('left')//左寄せ
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.producerName, numRows, 1).setHorizontalAlignment('left')//左寄せ
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.prductName, numRows, 1).setHorizontalAlignment('left')//左寄せ
      SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.columns.sizeUnit, numRows, 1).setHorizontalAlignment('left')//左寄せ
    }
    */
    //else{
    //空白行を挿入
    await this.sheet.insertDimension(
      "ROWS",
      {
        startIndex : STARTINDEX,
        endIndex   : ENDINDEX,
      },
      false
    )
    //}
    
    //値を入力 保存
    const p = []
    for(let i = 0; i < ordersArray.length; i++){
      //console.log(`--発注情報: ${ordersArray[i]}`)
      this.sheetData[i]._rawData = await ordersArray[i]
      //console.log("---rawData入力")
      p.push(this.sheetData[i].save({raw : false}))
      //console.log("---保存")
    }

    //行幅調整
    //SpreadSheet_API.dbSS_OrderList.sheet[0].autoResizeRows(this.sRow, numRows)

    //発注日時降順でソート
    //this.eRow = SpreadSheet_API.dbSS_OrderList.sheet[0].getLastRow()
    //this.rowNum = this.eRow - this.sRow + 1
    //SpreadSheet_API.dbSS_OrderList.sheet[0].getRange(this.sRow, this.sColumn, this.rowNum, this.eColumn).sort([{column: this.columns.orderday, ascending: false}]);
    
    //スプレッドシート キャッシュの更新
    Promise.all(p).then(async ()=>{
      console.log(`---発注リストキャッシュ更新 実行`)
      await SpreadSheet_API.upDateSpreadSheet_OrderList()
      console.log(`--新規発注情報登録完了`)
    })    
  }
}
module.exports = OrderRecords