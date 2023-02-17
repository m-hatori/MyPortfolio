/* eslint-disable semi-spacing */
/* eslint-disable one-var */
const property = require("./property.js");
const timeMethod = require("./getTime.js");

const SpreadSheet_API = require("./npm API/SpreadSheet_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const action_JSON = require("./LINE_Messaging_API/Action_JSON.js");
const flexMessage_ForBuyer = require("./LINE_Messaging_API/Flex Message Parts For Buyer.js");
const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");


/*●●オブジェクト定義
簡単に言うと登場人物（オブジェクト）の情報をここでまとめる。
各オブジェクトの属性、スプレッドシート列情報などを管理。*/
  
//●オブジェクト：商品リスト
class Products{
  constructor(SSID, sheetId = "") {
    this.SSID = SSID
    this.document = null

    this.sheetIds = {
      0:"134207291",
      1:"320501540",
      2:"1883943048",
      3:"349444130",
      4:"1344724153",
      5:"1891008356",
      6:"1480572267",
      7:"1273554517",
      8:"1693112024",
      9:"1208835130",
      10:"450662181",
      11:"1697600268",
      12:"414287395",
      13:"1336658130",
      14:"737290665",
      15:"828267981",
      16:"1080037946",
      17:"525976409",
      18:"1201066271",
    };
    this.range_allList = "A3:G20"
    this.range_productList = "A3:X22"
    this.range_stockNow = "O3:O22"
    this.range_stockNow_loaded = true
    this.sheetId
    this.sheet
    this.plSheetVals = null
    
    if(sheetId != ""){
      this.sheetId = sheetId      
    }

    this.sRow = 2; //行数-1
  }

  //初期化 シート取得  汎用メソッドにする
  async getSheet(){
    this.document = await SpreadSheet_API.getSpreadSheet(this.SSID)
  }

  //全 商品情報を取得 戻り値：配列   汎用メソッドにするか
  async getAllSheetData() {
    if(this.document === null){
      await this.getSheet()
    }    
    this.sheet = await this.document.sheetsById[this.sheetId]
    //console.log(`シート名: ${this.sheet.title}`);
    await this.sheet.loadHeaderRow(property.constPL.headersRow);

    //全範囲取得
    this.plSheetVals = await this.sheet
      .getRows({
        offset: property.constPL.sRow, //何も指定しなければヘッダーの次の行から読み込む
        limit: property.constPL.rowNum, //最大行数 途中で空白行が現れれば読み込み中止
      })
    //console.log(this.plSheetVals.length)
    //console.log(this.plSheetVals[0]._rawData[property.constPL.columns.productId])
    //console.log(this.plSheetVals[19]._rawData[property.constPL.columns.productId])
  }
  
  //個別商品情報を取得 戻り値：配列
  async getRowData(pId) {
    if(this.plSheetVals == null){
      await this.getAllSheetData()
    }
    return this.plSheetVals[pId - 1]._rawData
  }

  //商品リスト 一覧取得
  async getUpStateAllList(ORERBUTTON_STATE, OPTION_UPSTATE, TIMESTAMP_NEW){
    //●前処理
    await this.getSheet()
    
    //商品リスト List
    //シート取得
    let sheet_List = this.document.sheetsById[this.sheetIds[0]]

    //範囲ロード
    await sheet_List.loadCells(this.range_allList)
    //console.log(sheet_List.cellStats);
    //console.log(sheet_List.getCell(2, property.constallList.columns.title).value)
    
    let messagesArray = [], columns1 = [], columns2 = []
    let upState, title, detail, sheetId, postBackData, card
 
    //●メッセージ作成 買参人用 発注ボタンあり
    //console.log(property.constallList.sRow)
    //console.log(property.constallList.eRow)
    for(let i = property.constallList.sRow ; i <= property.constallList.eRow ; i++){

      upState = sheet_List.getCell(i, property.constallList.columns.upState).value
      if(upState){

        //カルーセルメッセージの各カード作成      
        title = sheet_List.getCell(i, property.constallList.columns.title).value
        detail = sheet_List.getCell(i, property.constallList.columns.detail).value
        sheetId = sheet_List.getCell(i, property.constallList.columns.sheetId).value
        postBackData = {
          timeStamp: TIMESTAMP_NEW,
          tag: "productsList",
          product: {
            sheetId: sheetId,
            ORERBUTTON_STATE: ORERBUTTON_STATE,
            OPTION_UPSTATE: OPTION_UPSTATE,
          }
        }
        //console.log(postBackData)
        card = getAllListCard(title, detail, postBackData)  
        
        //columnsに情報を格納する
        //1商品情報に基づき、Line Message APIのFMTに従い1JSON作成
        if(columns1.length < 10){columns1.push(card);}
        else if(columns2.length < 10){columns2.push(card);}
        //else if(columns3.length < 10){columns3.push(card);}
      }
    }
    
    //メッセージに商品情報を格納
    if(columns1.length != 0) {
      console.log("商品リスト一覧 1行目 作成")
      messagesArray.push(message_JSON.getflexCarouselMessage("商品リスト一覧①",columns1))
    }
    else{ 
      messagesArray.push(message_JSON.getTextMessage("現在商品情報がありません。\n次回の更新をお待ちくださいませ。"))
      messagesArray.push(new StampMessage().何卒)
    }

    if(columns2.length != 0) {
      console.log("商品リスト一覧 2行目 作成")
      messagesArray.push(message_JSON.getflexCarouselMessage("商品リスト一覧②",columns2))
    }
    
    console.log("商品リスト一覧取得完了")
    //console.log(message)
    return messagesArray    
  }

  //1商品リスト 取得
  async getAllproductInfo(ORERBUTTON_STATE, OPTION_UPSTATE, TIMESTAMP_NEW) {
    //シート取得
    if(this.plSheetVals == null){
      await this.getAllSheetData()
    }

    //商品情報をJSON形式に成形しcolumns1~3に格納
    //商品情報columns1~3ををメッセージオブジェクトmessageに格納
    //カルーセルメッセージの商品情報(最大10件)
    let messagesArray = [], columns1 = [], columns2 = [];
    let masterProductArray, card, pNum = 0
    
    //カルーセル作成
    //買参人用
    if(ORERBUTTON_STATE == 1){
      //掲載中or確認中選択
      if(OPTION_UPSTATE == 1){
        for(let i = 0 ; i < property.constPL.rowNum ; i++){
          masterProductArray = this.plSheetVals[i]._rawData
          
          //掲載 trueのみ
          if(masterProductArray[property.constPL.columns.upState] === "TRUE"){
            card = getProductsCarouselForBuyer(masterProductArray, this.getPostData(masterProductArray), TIMESTAMP_NEW)
            
            //columnsに情報を格納する
            pNum++
            if(pNum <= 10){
              //1商品情報に基づき、Line Message APIのFMTに従い1JSON作成
              columns1.unshift(card);
            }
            else{
              columns2.unshift(card);
            }            
          }          
        }
      }
      else if(OPTION_UPSTATE == 0){
        for(let i = 0 ; i < property.constPL.rowNum ; i++){
          masterProductArray = this.plSheetVals[i]._rawData

          //掲載 false、かつ出荷者名、商品名、販売価格が空欄でないもののみ
          if( masterProductArray[property.constPL.columns.upState] == "FALSE" &&
              masterProductArray[property.constPL.columns.producerName] != "" &&
              masterProductArray[property.constPL.columns.name] != "" &&
              masterProductArray[property.constPL.columns.sellingPrice] != ""
            ){
            
            card = getProductsCarouselForBuyer(masterProductArray, this.getPostData(masterProductArray), TIMESTAMP_NEW)
          
            //columnsに情報を格納する
            pNum++
            if(pNum <= 10){
              //1商品情報に基づき、Line Message APIのFMTに従い1JSON作成
              columns1.unshift(card);
            }
            else{
              columns2.unshift(card);
            }
          }
        }        
      }
    }
    //一般用
    else if(ORERBUTTON_STATE == 0){
      //掲載中
      if(OPTION_UPSTATE == 1){
        for(let i = 0 ; i < property.constPL.rowNum ; i++){
          masterProductArray = this.plSheetVals[i]._rawData

          //掲載 trueのみ
          if(masterProductArray[property.constPL.columns.upState] == "TRUE"){
            
            card = flexMessage_ForBuyer.getProductsCarouselForCommon(masterProductArray)
            
            //columnsに情報を格納する
            pNum++
            if(pNum <= 10){
              //1商品情報に基づき、Line Message APIのFMTに従い1JSON作成
              columns1.unshift(card);
            }
            else{
              columns2.unshift(card);
            }           
          }          
        }
      }
      else if(OPTION_UPSTATE == 0){
        for(let i = 0 ; i < property.constPL.rowNum ; i++){
          masterProductArray = this.plSheetVals[i]._rawData

          //掲載 falseのみ 出荷者名、商品名、販売単価が入力済み
          if(masterProductArray[property.constPL.columns.upState] == "FALSE" &&
              masterProductArray[property.constPL.columns.producerName] != "" &&
              masterProductArray[property.constPL.columns.name] != "" &&
              masterProductArray[property.constPL.columns.sellingPrice] != ""
            ){
            
            card = flexMessage_ForBuyer.getProductsCarouselForCommon(masterProductArray)
          
            //columnsに情報を格納する
            pNum++
            if(pNum <= 10){
              //1商品情報に基づき、Line Message APIのFMTに従い1JSON作成
              columns1.unshift(card);
            }
            else{
              columns2.unshift(card);
            }
          }
        }        
      }
    }

    //メッセージ格納
    if(pNum > 10){
      messagesArray.unshift(message_JSON.getflexCarouselMessage("新着おすすめ商品①",columns1))
      messagesArray.unshift(message_JSON.getflexCarouselMessage("新着おすすめ商品②",columns2))
    }
    else if(pNum > 0){
      messagesArray.unshift(message_JSON.getflexCarouselMessage("新着おすすめ商品①",columns1))
    }
    else{
      messagesArray.push(message_JSON.getTextMessage("現在商品情報がありません。\n次回の更新をお待ちくださいませ。"), new StampMessage().何卒)
    }

    return messagesArray;
  }

  //個別商品
  /*
  getRow(pId) {
    return Number(pId) + Number(property.constPL.sRow) - 1
    //console.log("商品行：" + row)
  }
  */

  //商品情報  発注、カートへボタン用
  getPostData(masterProductArray){
    return {
      product: {
        sheetId: Number(this.sheetId),
        productId: Number(masterProductArray[property.constPL.columns.productId]),
        producer: masterProductArray[property.constPL.columns.numA] + "-" + masterProductArray[property.constPL.columns.numB] + " " +  masterProductArray[property.constPL.columns.producerName],
        name: masterProductArray[property.constPL.columns.name] ,
        norm: masterProductArray[property.constPL.columns.norm],
        orderState: 0, // 発注情報 未確認: 0,  発注情報 未確認(2回目以降はテキストメッセージ不要):2, 発注情報 確認済み: 1
        orderNum: 1,
        deliveryday: timeMethod.getDateFMSpreadSheetToLINE(masterProductArray[property.constPL.columns.sDeliveryday], "LINE")//Deliveryday def:納品開始日 
      },
    }
  }

  //在庫更新
  async setNewStock(pId, stockNow, orderNum){
    //更新行
    const ROW = this.sRow + Number(pId) - 1
    console.log(`ROW : ${ROW}`)
    
    //最新 現在庫
    const NEWSTOCK = Number(stockNow) - Number(orderNum);
    console.log(`NEWSTOCK: ${NEWSTOCK}`)

    //現在庫セル範囲 ロード
    if(this.range_stockNow_loaded){
      await this.sheet.loadCells(this.range_stockNow)
      this.range_stockNow_loaded = false
    }
    const CELL_STOCKNOW = this.sheet.getCell(ROW, property.constPL.columns.stockNow)   
    CELL_STOCKNOW.value = NEWSTOCK//情報更新
  }
}
module.exports = Products;

//●商品リスト一覧 カルーセルメッセージ(Flex Messge) 買参人、一般用
const getAllListCard = function(title, detail, postBackData) {
  return {
    "type": "bubble",
    "size": "kilo",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": title,
          "size": "lg",
          "wrap": true,
          "decoration": "underline",
          "weight": "bold",
          "adjustMode": "shrink-to-fit"
        },
        {
          "type": "text",
          "text": detail,
          "size": "md",
          "wrap": true
        }
      ],
      "spacing": "md"
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "height": "sm",
          "action": action_JSON.getPostbackActionWithText("詳細", postBackData, "詳細")
        }
      ],
    },
    "styles": {
      "footer": {
        "separator": true
      }
    }
  }
}

//●商品リスト カルーセルメッセージ(Flex Messge)
const getProductsCarouselForBuyer = (masterProductArray, postBackData, TIMESTAMP_NEW) => {
  let bodyContents  = [], imageContents = [], footerContents = []

  //newItem表示
  imageContents = flexMessage_ForBuyer.getCardbodyNewIcon(imageContents, masterProductArray[property.constPL.columns.judgeNew])
  
  //現在庫数字でない 発注ボタンを非表示 現在庫 テキスト表示
  const stockNow = Number(masterProductArray[property.constPL.columns.stockNow]) 
  //現II庫数字 残口あり 発注ボタンを表示
  if(stockNow > 0) {
    //body
    imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "残" + stockNow + "口")  //残口
    
    //footer
    const TEXT_AFTER_PUSH_BOTTUN = `${postBackData.product.name}｜${postBackData.product.norm}`
    const postBackDataBuy = {
      timeStamp: TIMESTAMP_NEW,
      tag: "instantOrder",
      command: "check",  
      product: postBackData.product,
    }
    const postBackDataAddCart = {
      timeStamp: TIMESTAMP_NEW,
      tag: "cart",
      command: "add",  
      product: postBackData.product,
    }
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottun("発注",  `${TEXT_AFTER_PUSH_BOTTUN}を発注`, postBackDataBuy))
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWithText("カートへ", postBackDataAddCart, `${TEXT_AFTER_PUSH_BOTTUN}をカートへ`))
  }

  //現在庫数字 残口なし 発注ボタンを非表示
  else{
    //body
    imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "完売")  //残口
  }
  //body 共通
  bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(masterProductArray[property.constPL.columns.picUrl]), imageContents))//商品情報１  画像、NEWアイコン、残口追加
  bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(postBackData, masterProductArray[property.constPL.columns.deliveryPeriod]))//商品情報2   商品名～市場納品期間

  return  flexMessage_ForBuyer.getProductCardForBuyer(bodyContents, footerContents)
}