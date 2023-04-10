/* eslint-disable semi-spacing */
/* eslint-disable one-var */
const property = require("../../src/module/property.js");
//const timeMethod = require("../../src/module/getTime.js");

const Firestore_API = require("./npm API/FireStore_API.js");
const SpreadSheet_API = require("./npm API/SpreadSheet_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
//const action_JSON = require("./LINE_Messaging_API/Action_JSON.js");
const flexMessage_ForBuyer = require("./LINE_Messaging_API/Flex Message Parts For Buyer.js");
const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");
  
//●オブジェクト：商品リスト
class Products{
  constructor(sheetId = "") {
    //google―spreadsheet parameter
    this.sheetId = sheetId    
    this.sheet
    if(this.sheetId != ""){
      this.sheet = SpreadSheet_API.dbSS_ProductsList.sheet[this.sheetId]
    }    
    //this.range_allList = "A3:G20"
    //this.range_productList = "A3:X22"
    //this.range_stockNow = "O3:O22"
    //this.range_stockNow_loaded = true
    this.sRow = 2; //行数-1

    //firestore parameter 値は速度の速いfirestoreから受け取る
    this.plSheetVals = Firestore_API.dbData.plSheet[this.sheetId]
  }

  //1商品リスト 取得
  async getAllproductInfo(ORERBUTTON_STATE, OPTION_UPSTATE, TIMESTAMP_NEW) {
    //商品情報をJSON形式に成形しcolumns1~3に格納
    //商品情報columns1~3ををメッセージオブジェクトmessageに格納
    //カルーセルメッセージの商品情報(最大10件)
    let messagesArray = [], columns1 = [], columns2 = [];
    let productInfoArray, card, pNum = 0
    
    //カルーセル作成
    //買参人用
    if(ORERBUTTON_STATE == 1){
      //掲載中or確認中選択
      if(OPTION_UPSTATE == 1){
        for(let i = 1 ; i <= property.constPL.rowNum ; i++){
          //productInfoArray = this.plSheetVals[i]._rawData //spreadsheet
          productInfoArray = this.plSheetVals[i] //firestore
          
          //掲載 trueのみ
          if(productInfoArray[property.constPL.columns.upState]){
            //console.log(JSON.stringify(productInfoArray))

            card = getProductsCarouselForBuyer(productInfoArray, this.getPostData(productInfoArray), TIMESTAMP_NEW)

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
        for(let i = 1 ; i <= property.constPL.rowNum ; i++){
          productInfoArray = this.plSheetVals[i]

          //掲載 false、かつ出荷者名、商品名、販売価格が空欄でないもののみ
          if( !productInfoArray[property.constPL.columns.upState] &&
              productInfoArray[property.constPL.columns.producerName] != "" &&
              productInfoArray[property.constPL.columns.name] != "" &&
              productInfoArray[property.constPL.columns.sellingPrice] != ""
            ){
            
            card = getProductsCarouselForBuyer(productInfoArray, this.getPostData(productInfoArray), TIMESTAMP_NEW)
          
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
        for(let i = 1 ; i <= property.constPL.rowNum ; i++){
          productInfoArray = this.plSheetVals[i]

          //掲載 trueのみ
          if(productInfoArray[property.constPL.columns.upState]){
            
            card = flexMessage_ForBuyer.getProductsCarouselForCommon(productInfoArray)
            
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
        for(let i = 1 ; i <= property.constPL.rowNum ; i++){
          productInfoArray = this.plSheetVals[i]

          //掲載 falseのみ 出荷者名、商品名、販売単価が入力済み
          if( !productInfoArray[property.constPL.columns.upState] &&
              productInfoArray[property.constPL.columns.producerName] != "" &&
              productInfoArray[property.constPL.columns.name] != "" &&
              productInfoArray[property.constPL.columns.sellingPrice] != ""
            ){
            
            card = flexMessage_ForBuyer.getProductsCarouselForCommon(productInfoArray)
          
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

  //商品情報  発注、カートへボタン用
  //firestore
  getPostData(productInfoArray){
    const postBackData = {
      product: {
        sheetId: Number(this.sheetId),
        productId: Number(productInfoArray[property.constPL.columns.productId]),
        producer: productInfoArray[property.constPL.columns.numA] + "-" + productInfoArray[property.constPL.columns.numB] + " " +  productInfoArray[property.constPL.columns.producerName],
        name: productInfoArray[property.constPL.columns.name] ,
        norm: productInfoArray[property.constPL.columns.norm],
        orderState: 0, // 発注情報 未確認: 0,  発注情報 未確認(2回目以降はテキストメッセージ不要):2, 発注情報 確認済み: 1
        orderNum: 1,
        deliveryday: productInfoArray[property.constPL.columns.sDeliveryday]._seconds*1000
      }
    }
    //console.log(`postBackData: ${JSON.stringify(postBackData)}`)
    return postBackData
  }
  //spreadSheet
  /*
  getPostData(productInfoArray){
    return {
      product: {
        sheetId: Number(this.sheetId),
        productId: Number(productInfoArray[property.constPL.columns.productId]),
        producer: productInfoArray[property.constPL.columns.numA] + "-" + productInfoArray[property.constPL.columns.numB] + " " +  productInfoArray[property.constPL.columns.producerName],
        name: productInfoArray[property.constPL.columns.name] ,
        norm: productInfoArray[property.constPL.columns.norm],
        orderState: 0, // 発注情報 未確認: 0,  発注情報 未確認(2回目以降はテキストメッセージ不要):2, 発注情報 確認済み: 1
        orderNum: 1,
        deliveryday: timeMethod.getDateFMSpreadSheetToLINE(productInfoArray[property.constPL.columns.sDeliveryday], "LINE")//Deliveryday def:納品開始日
      },
    }
  }
  */
  
  //スプレッドシート 在庫更新
  //新規在庫 NEWSTOCK: firestoreに書き込んだ値を使い、整合性を保つ
  async setNewStockToSpreadSheet(productId, NEWSTOCK){
    //更新行
    const ROW = this.sRow + Number(productId) - 1
    //console.log(`ROW : ${ROW}`)
       
    if(this.sheet === null || this.sheet === undefined){
      await SpreadSheet_API.upDateSpreadSheet_ProductsList(this.sheetId)
      this.sheet = SpreadSheet_API.dbSS_ProductsList.sheet[this.sheetId]
    }
    //セル操作
    const CELL_STOCKNOW = this.sheet.getCell(ROW, property.constPL.columns.stockNow)
    CELL_STOCKNOW.value = NEWSTOCK
    
    //行操作
    //SpreadSheet_API.dbSS_ProductsList.vals[this.sheetId][ROW]._rawData[property.constPL.columns.stockNow] = NEWSTOCK
    //SpreadSheet_API.dbSS_ProductsList.vals[this.sheetId][ROW].save({raw : false})
  }

  //firestore 在庫更新
  setNewStockTofirestore(productId, orderNum){    
    const productArray = Firestore_API.dbData.plSheet[this.sheetId][productId] //更新対象
    const NEWSTOCK = Number(productArray[property.constPL.columns.stockNow]) - Number(orderNum) //新在庫
    console.log(`シート${property.sheetNumber[this.sheetId]} firestore 現在庫更新: ${productArray[property.constPL.columns.stockNow]} → ${NEWSTOCK}`)
    
    //firestore更新
    productArray[property.constPL.columns.stockNow] = NEWSTOCK
    Firestore_API.dbRef.plSheet.update({
      [this.sheetId]: Firestore_API.dbData.plSheet[this.sheetId]
    });

    return NEWSTOCK
  }
  
  //●在庫更新 単品
  async setNewStock(productId, orderNum){
    const NEWSTOCK = this.setNewStockTofirestore(productId, orderNum)//firestore
    await this.setNewStockToSpreadSheet(productId, NEWSTOCK)
    await this.sheet.saveUpdatedCells();
    //await SpreadSheet_API.upDateSpreadSheet_ProductsList(this.sheetId) //商品情報はfirestoreを使用しているので更新不要→SpreadSheetの情報に統一したい
  }  
}
module.exports = Products;

//●商品リスト カルーセルメッセージ(Flex Messge)
const getProductsCarouselForBuyer = (productInfoArray, postBackData, TIMESTAMP_NEW) => {
  let bodyContents  = [], imageContents = [], footerContents = []

  //newItem表示
  imageContents = flexMessage_ForBuyer.getCardbodyNewIcon(imageContents, productInfoArray[property.constPL.columns.judgeNew])
  
  //現在庫
  const stockNow = Number(productInfoArray[property.constPL.columns.stockNow]) 
  
  //現在庫 残口あり 発注ボタンを表示
  if(stockNow > 0) {
    //body
    imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, `残${stockNow}口`)  //残口
    
    //footer
    const PRODUCTINFO = `${postBackData.product.name} | ${postBackData.product.norm}`
    const postBackDataBuy = {
      timeStamp: TIMESTAMP_NEW,
      tag: "instantOrder",
      command: "check",
      product: postBackData.product,
    }
    //console.log(`発注ボタンpostBackData: ${JSON.stringify(postBackDataBuy)}`)

    const postBackDataAddCart = {
      timeStamp: TIMESTAMP_NEW,
      tag: "cart",
      command: "add", 
      product: postBackData.product
    }
    //console.log(`買い物かごへボタンpostBackData: ${JSON.stringify(postBackDataAddCart)}`)
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottun("発注",  `${PRODUCTINFO}を発注`, postBackDataBuy))
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWithText("カートへ", postBackDataAddCart, `${PRODUCTINFO}をカートへ`))
  }

  //現在庫 残口なし 発注ボタンを非表示
  else{
    //body
    imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "完売")  //残口
  }
  //body 共通
  bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(productInfoArray[property.constPL.columns.picUrl]), imageContents))//商品情報１  画像、NEWアイコン、残口追加
  bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(productInfoArray))//商品情報2   商品名～市場納品期間

  //console.log(JSON.stringify(bodyContents))
  //console.log(JSON.stringify(footerContents))
  return  flexMessage_ForBuyer.getProductCardForBuyer(bodyContents, footerContents)
}