/* eslint-disable semi-spacing */
/* eslint-disable one-var */
//11/29 Done

const property = require("./property.js");
const other_api = require("./other_api.js");
const message_JSON = require("./message_JSON.js");
const flexMessage_Products = require("./Flex Message Products.js");
const timeMethod = require("./getTime.js");

const StampMessage = require("./class Stamp.js");


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
    this.document = await other_api.initializeDoc(this.SSID)
  }

  //全 商品情報を取得 戻り値：配列   汎用メソッドにするか
  async getAllSheetData() {
    if(this.document === null){
      await this.getSheet()
    }    
    this.sheet = await this.document.sheetsById[this.sheetId]
    console.log(`シート名: ${this.sheet.title}`);
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
    let upState, title, detail, sheetId, postBackData, postBackDataEnd = "∫" + ORERBUTTON_STATE + "∫" + OPTION_UPSTATE, card
 
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
        postBackData = "productsList"+ "---" + TIMESTAMP_NEW + "∫" + sheetId + postBackDataEnd;
        
        /* 11/20 test done
        console.log(i + title + detail + postBackData)
        break;
        */

        card = flexMessage_Products.getAllListCard(title, detail, postBackData)  
        
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

  //1商品リスト 商品情報取得 カルーセルメッセージ
  async getAllproductInfo(ORERBUTTON_STATE, OPTION_UPSTATE, TIMESTAMP) {
    //TODO: シート有無確認
    //if(this.sheet == null){return [message_JSON.getTextMessage("当商品リストは編集中です。もうしばらくお待ちください。"), new StampMessage().何卒]}

    //シート取得
    if(this.plSheetVals == null){
      await this.getAllSheetData()
    }

    //商品情報をJSON形式に成形しcolumns1~3に格納
    //商品情報columns1~3ををメッセージオブジェクトmessageに格納
    //カルーセルメッセージの商品情報(最大10件)
    let messagesArray = [], columns1 = [], columns2 = [];
    let buff, card, pNum = 0
    
    //カルーセル作成
    //買参人用
    if(ORERBUTTON_STATE == 1){
      //掲載中or確認中選択
      if(OPTION_UPSTATE == 1){
        for(let i = 0 ; i < property.constPL.rowNum ; i++){
          buff = this.plSheetVals[i]._rawData
          
          //掲載 trueのみ
          if(buff[property.constPL.columns.upState] === "TRUE"){
            card = flexMessage_Products.getProductsCarouselForBuyer(buff, this.getPostData(buff), TIMESTAMP)
            
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
          buff = this.plSheetVals[i]._rawData

          //掲載 false、かつ出荷者名、商品名、販売価格が空欄でないもののみ
          if( buff[property.constPL.columns.upState] == "FALSE" &&
              buff[property.constPL.columns.producerName] != "" &&
              buff[property.constPL.columns.name] != "" &&
              buff[property.constPL.columns.sellingPrice] != ""
            ){
            
            card = flexMessage_Products.getProductsCarouselForBuyer(buff, this.getPostData(buff), TIMESTAMP)
          
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
          buff = this.plSheetVals[i]._rawData

          //掲載 trueのみ
          if(buff[property.constPL.columns.upState] == "TRUE"){
            
            card = flexMessage_Products.getProductsCarouselForCommon(buff)
            
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
          buff = this.plSheetVals[i]._rawData

          //掲載 falseのみ 出荷者名、商品名、販売単価が入力済み
          if(buff[property.constPL.columns.upState] == "FALSE" &&
              buff[property.constPL.columns.producerName] != "" &&
              buff[property.constPL.columns.name] != "" &&
              buff[property.constPL.columns.sellingPrice] != ""
            ){
            
            card = flexMessage_Products.getProductsCarouselForCommon(buff)
          
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
  getPostData(productArray){
    return this.sheetId + "∫" + productArray[property.constPL.columns.productId] +
      "∫" + productArray[property.constPL.columns.numA] + "-" + productArray[property.constPL.columns.numB] + " " +  productArray[property.constPL.columns.producerName] +
      "∫" + productArray[property.constPL.columns.name] +
      "∫" + productArray[property.constPL.columns.norm] +
      "∫" + 0 + //reOrder def:0
      "∫" + "on1" + //orderNum def:1
      "∫" + timeMethod.getDateFMSpreadSheetToLINE(productArray[property.constPL.columns.sDeliveryday], "LINE") //Deliveryday def:納品開始日
  }

  //在庫更新
  async setNewStock(pId, stockNow, orderNum){
    //更新行
    const ROW = this.sRow + Number(pId) - 1
    //console.log(`ROW : ${ROW}`)
    
    //最新 現在庫
    const NEWSTOCK = Number(stockNow) - Number(orderNum);

    //現在庫セル範囲 ロード
    //TODO: 返り値でロード済みか判定
    await this.sheet.loadCells(this.range_stockNow) // loads range of cells into local cache - DOES NOT RETURN THE CELLS
    const CELL_STOCKNOW = this.sheet.getCell(ROW, property.constPL.columns.stockNow)

    //情報更新
    CELL_STOCKNOW.value = NEWSTOCK
  }
}
module.exports = Products;