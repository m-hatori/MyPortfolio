/* eslint-disable one-var */
const property = require("./property.js");
const timeMethod = require("./getTime.js");

const SpreadSheet_API = require("./npm API/SpreadSheet_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
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
    this.sheet = SpreadSheet_API.dbSS_OrderList.doc.sheetsById[this.sheetId]
    this.sheetData

    //スプレッドシート 発注リスト ユーザーパラメータ
    this.user = user
    this.sheetDataOfTheUser
    
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

    //Products sheetId
    this.sheetNumber = {
      "320501540":"S1",
      "349444130":"S3",
      "414287395":"S12",
      "450662181":"S10",
      "525976409":"S17",
      "737290665":"S14",
      "828267981":"S15",
      "1080037946":"S16",
      "1201066271":"S18",
      "1208835130":"S9",
      "1273554517":"S7",
      "1336658130":"S13",
      "1344724153":"S4",
      "1480572267":"S6",
      "1693112024":"S8",
      "1697600268":"S11",
      "1883943048":"S2",
      "1891008356":"S5"
    }
    
    //全商品リストシ-トID 発注情報に記載するマスタ
    this.allSheetIdsArray = [
      320501540,
      349444130,
      414287395,
      450662181,
      525976409,
      737290665,
      828267981,
      1080037946,
      1201066271,
      1208835130,
      1273554517,
      1336658130,
      1344724153,
      1480572267,
      1693112024,
      1697600268,
      1883943048,
      1891008356,
    ]
  }
  //任意ユーザーの発注履歴を取得
  async getUserOrderData(){
    //発注全情報
    
    //*/
    /* old
    if(this.document === undefined){
    this.document = await SpreadSheet_API.getSpreadSheet(process.env.SPREADSHEETID_ORDER)
    }
    this.sheet = this.document.sheetsById[this.sheetId]
    */

    //全範囲取得
    if(this.sheetData === undefined){
      console.time(`--all range読み込み`)
      this.sheetData = await this.sheet.getRows()
      console.timeEnd(`--all range読み込み`)
      this.rowNum = this.sheetData.length
      this.eRow = this.rowNum - this.sRow + 1 //タイトル行を加える

      //任意ユーザーの発注全情報
      let userOrderArray = [], buff;
      for(buff of this.sheetData){
        if(buff._rawData[this.columns.MARKET_ID] == this.user.property.MARKET_ID && buff._rawData[this.columns.BRANCH_NUM] == this.user.property.BRANCH_NUM){
          userOrderArray.push(buff)
        }
      }
      this.sheetDataOfTheUser = userOrderArray;
      this.recordNum = this.sheetDataOfTheUser.length
      //console.log(this.sheetDataOfTheUser)
      console.log(`--発注履歴件数 : ${this.recordNum}`)    
    }    
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
    let messagesArray = [], columns1 = [], columns2 = [], columns3 = []
    let card
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
        card = this.getOrderRecordCard(this.sheetDataOfTheUser[pNum]._rawData)

        //columnsに情報を格納する
        if(pNum <= 10){ columns1.push(card) }
        else if(pNum <= 20){ columns2.push(card) }            
        else{ columns3.push(card) }            
      }

      //メッセージ格納      
      messagesArray.push(message_JSON.getflexCarouselMessage("発注履歴part1",columns1))//メッセージ1
      if(pNum > 10){messagesArray.push(message_JSON.getflexCarouselMessage("発注履歴part2",columns2))}//メッセージ2      
      if(pNum > 20){messagesArray.push(message_JSON.getflexCarouselMessage("発注履歴part3",columns3))}//メッセージ3
      messagesArray.push(message_JSON.getTextMessage("買参人番号" + this.user.property.MARKET_ID + "-" + this.user.property.BRANCH_NUM + "様\n過去30日の発注履歴を上に表示しました。"))//メッセージ4
    }
    return messagesArray
  }

  //FlexMessage カルーセルカード 発注履歴 取得
  getOrderRecordCard(array){
    const orderDate = "発注日:" + array[this.columns.orderday].split(" ")[0]
    const norm = array[this.columns.size] + array[this.columns.sizeUnit] + array[this.columns.quantityPerCase] +
      "入 ｜単価" + array[this.columns.sellingPrice] + "円"
    const producerInfo = array[this.columns.pnumA] + "-" + array[this.columns.pnumB] + " " + array[this.columns.producerName]
    const stateOrderNum    = "希望口数：" + array[this.columns.orderNum]
    const stateDeliveryday = "希望市場納品日：" + array[this.columns.deliveryday] //'yy/mm/dd(day)
    
    /* デバック
    console.log(`${norm}`)
    console.log(`${producerInfo}`)
    console.log(`${stateOrderNum}`)
    console.log(`${stateDeliveryday}`)
    */
    return {
      "type": "bubble",
      "size": "kilo",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "baseline",
            "contents": [
              {
                "type": "text",
                "text": orderDate,
                "size": "md",
                "align": "center"
              }
            ],
            "backgroundColor": "#fa8072",
            "paddingTop": "sm",
            "paddingBottom": "sm"              
          },            
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "text",
                "text": array[this.columns.prductName],
                "size": "md",
                "weight": "bold",
                "wrap": true
              },
              {
                "type": "text",
                "text": norm,
                "size": "md",
                "wrap": true
              },
              {
                "type": "text",
                "text": producerInfo,
                "size": "md",
                "adjustMode": "shrink-to-fit"
              },
              {
                "type": "separator",
                "margin": "xs",
                "color": "#000000"
              },
              {
                "type": "text",
                "text": stateOrderNum,
                "size": "md",
                "wrap": true
              },
              {
                "type": "text",
                "text": stateDeliveryday,
                "size": "md",
                "adjustMode": "shrink-to-fit"
              },
              {
                "type": "text",
                "text": " ",
                "size": "md",
                "wrap": true
              },              
            ],
            "spacing": "sm",
            "paddingStart": "xl",
            "paddingEnd": "xl"        
          },
        ],
        "spacing": "sm",
        "paddingAll": "none"
      },
      "styles": {
        "body": {
          "backgroundColor": "#fddea5"
        },
      }
    }
  }

  //●発注履歴の照合
  //masterProductArray: []
  //deliveryday: YYYY-MM-DD
  async certificateOrderRecord(masterProductArray, deliveryday, wantCell){
    //発注履歴比較用 新規発注データ
    const newOrder = this.getNewOrderForcheck(masterProductArray, deliveryday)
    
    //発注履歴比較用 過去発注全データ    
    const ordersArrayForcheck = this.getOrdersArrayForcheck();    
    for (let buff of ordersArrayForcheck){      
      if(newOrder === buff){
        console.log(`今回の発注 ${newOrder}`)
        console.log(`発注の履歴 ${buff}`)
        if(wantCell){
          return buff;  //useridが等しく、かつ発注しようとしている情報と同じ発注履歴を返す。
        }
        else{
          return true;
        }
      }
    }
    //発注しようとしている情報と同じ発注履歴が１つもない
    return false
  }

  //発注履歴照合用文字列を全取得
  //新規発注情報が 発注済みでないか比較するため
  getOrdersArrayForcheck(){    
    let orderRecordsArray = [], buff;
    for (buff of this.sheetDataOfTheUser){
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
  getNewOrderForcheck(masterProductArray, deliveryday){
    return  timeMethod.getDateFmt(deliveryday, "orderList_deliveryday") + masterProductArray[property.constPL.columns.numA] + masterProductArray[property.constPL.columns.numB] +
      masterProductArray[property.constPL.columns.name] +
      masterProductArray[property.constPL.columns.size] +
      masterProductArray[property.constPL.columns.sizeUnit] +
      masterProductArray[property.constPL.columns.quantityPerCase] +
      masterProductArray[property.constPL.columns.purchasePrice] +
      masterProductArray[property.constPL.columns.sellingPrice];
  }
  
  
  //●新規発注
  //1商品 新規発注情報配列作成
  getOrderArray(TIMESTAMP, postBackData, masterProductArray, desiredDeliveryday){
    //新規発注情報
    // 発注日時	"希望市場納品日"	"買参人親番号"	"買参人枝番号"	買参人名
    //"JANコード（将来用）"	商品ID	"産地担当"	"出荷者親番号"	"出荷者枝番号"	出荷者名	"商品マスタコード"	商品名	サイズ	単位	入数 "希望口数"	"仕入単価"	"販売単価"  
    const ORDER_TIME = timeMethod.getDateFmt(TIMESTAMP, "orderList_orderDay")
    return [
      ORDER_TIME, desiredDeliveryday, this.user.property.MARKET_ID, this.user.property.BRANCH_NUM, this.user.property.BUYER_NAME,
      "",//JANコード 予定
      `${this.sheetNumber[postBackData.product.sheetId]}-${masterProductArray[property.constPL.columns.productId]}`,
      masterProductArray[property.constPL.columns.salesStaffName],
      masterProductArray[property.constPL.columns.numA],
      masterProductArray[property.constPL.columns.numB],
      masterProductArray[property.constPL.columns.producerName],
      masterProductArray[property.constPL.columns.productCode],
      masterProductArray[property.constPL.columns.name],
      masterProductArray[property.constPL.columns.size],
      masterProductArray[property.constPL.columns.sizeUnit],
      masterProductArray[property.constPL.columns.quantityPerCase],
      postBackData.product.orderNum,      
      masterProductArray[property.constPL.columns.purchasePrice],
      masterProductArray[property.constPL.columns.sellingPrice],
    ]
  }

  //発注挿入
  /*
  //課題
    発注が複数あるとき、保存は一括で行いたい→検討中
    スプレッドシートの体裁を操作できない→すべての発注情報をアーカイブしてしまったとき問題となる。
  */
  async insertOrderRecord(ordersArray){
    //console.log(ordersArray)
    const STARTINDEX = this.sRow + 1 //挿入始端行 0(1行目), 1(2行目), 2(3行目)....
    const ENDINDEX = ordersArray.length + STARTINDEX  //挿入終端行 挿入始端行＋挿入行数
    console.log(`-発注リストへ登録 挿入始端行 : ${STARTINDEX}   挿入終端行 : ${ENDINDEX}`)
    
    //let inputRange = this.sheet.getRange(this.sRow, this.columns.orderday, numRows, this.orderColNum)

    //TODO: 体裁変更
    /*
    if(this.eRow <= this.sRow){
      //空白行挿入
      this.sheet.insertRowsAfter(this.sRow - 1, numRows)

      let allRange = this.sheet.getRange(this.sRow, this.columns.orderday, numRows, this.eColumn)

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
      
      this.sheet.getRange(this.sRow, this.columns.orderday, numRows, this.eColumn).setFontSizes(fontsize)
      this.sheet.getRange(this.sRow, this.columns.orderday, numRows, 2).setNumberFormats(dayformat)
      

      //チェックボックス挿入
      this.sheet.getRange(this.sRow, this.columns.systemInputOrderNow, numRows, 1).insertCheckboxes()
      this.sheet.getRange(this.sRow, this.columns.systemInputOrder, numRows, 1).insertCheckboxes()

      //すべて中央寄せ
      allRange.setHorizontalAlignment('center')//中央寄せ

      //発注日時～販売単価まですべて右寄せ
      inputRange.setHorizontalAlignment('right')//右寄せ

      //個別に左寄せ
      this.sheet.getRange(this.sRow, this.columns.buyerName, numRows, 1).setHorizontalAlignment('left')//左寄せ
      this.sheet.getRange(this.sRow, this.columns.salesPerson, numRows, 1).setHorizontalAlignment('left')//左寄せ
      this.sheet.getRange(this.sRow, this.columns.producerName, numRows, 1).setHorizontalAlignment('left')//左寄せ
      this.sheet.getRange(this.sRow, this.columns.prductName, numRows, 1).setHorizontalAlignment('left')//左寄せ
      this.sheet.getRange(this.sRow, this.columns.sizeUnit, numRows, 1).setHorizontalAlignment('left')//左寄せ
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

    //console.log(this.sheetData[0]._rawData)
    
    //値を入力 保存
    for(let i = 0; i < ordersArray.length; i++){
      this.sheetData[i]._rawData = ordersArray[i]
      await this.sheetData[i].save({raw : false})
    }    

    //行幅調整
    //this.sheet.autoResizeRows(this.sRow, numRows)

    //発注日時降順でソート
    //this.eRow = this.sheet.getLastRow()
    //this.rowNum = this.eRow - this.sRow + 1
    //this.sheet.getRange(this.sRow, this.sColumn, this.rowNum, this.eColumn).sort([{column: this.columns.orderday, ascending: false}]);
    
    
    //スプレッドシート キャッシュの更新
    //await SpreadSheet_API.updateSpreadSheet(SpreadSheet_API.dbSS_OrderList)
  }
}
module.exports = OrderRecords