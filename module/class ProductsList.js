/* eslint-disable semi-spacing */
/* eslint-disable one-var */
const property = require("../../src/module/property.js");

const FireStore_API = require("./npm API/FireStore_API.js");

const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const flexMessage_ForBuyer = require("./LINE_Messaging_API/Flex Message Parts For Buyer.js");
const action_JSON = require("./LINE_Messaging_API/Action_JSON.js");

//●オブジェクト：商品リスト
class Products{
  constructor(sheetId = "") {
    //google―spreadsheet parameter
    this.sheetId = sheetId
    this.List
    this.plSheetVals
  }

  async getDB(){
    const dbData = await FireStore_API.accessFirestore("getDB")
    this.List = dbData.List
    this.plSheetVals = dbData.plSheet[this.sheetId]
    console.log(`商品情報 DB取得`)
  }

  //1商品リスト 取得
  async getAllproductInfo(postBackData, TIMESTAMP_NEW, lineNum) {
    let messagesArray = []
    if(this.plSheetVals === undefined){await this.getDB()}

    //リスト情報 取得
    let contents = [], title, detail, preList, nextList
    for(let key in this.List){
      if(this.List[key][property.constAllList.columns.sheetId] == this.sheetId){
        title = this.List[key][property.constAllList.columns.title]
        detail = this.List[key][property.constAllList.columns.detail]
        const nextListIndex = Number(key) - 1
        const preListIndex = Number(key) + 1
        //console.log(`1つ新しい要素番号: ${nextListIndex}  |  １つ古い要素番号: ${preListIndex}`)

        nextList = this.List[nextListIndex] //1つ新しいリスト
        //console.log(`１つ新しいリスト情報 ${nextList}`)
        
        preList = this.List[preListIndex]  //1つ古いリスト
        //console.log(`１つ古いリスト情報 ${preList}`)
        break;
      }
    }    

    //リストタイトル or 詳細が異なる場合 商品リスト一覧を再表示
    if(postBackData.product.title != title || postBackData.product.detail != detail) {
      messagesArray = await FireStore_API.getUpStateAllList(TIMESTAMP_NEW, true)  //買参人用、掲載中, タイムスタンプ
      textMessage += "\n\n商品リストが更新されました。再表示した商品リストより、再度手続きをお願いいたします。"
      messagesArray.push(message_JSON.getTextMessage(textMessage))
      return messagesArray
    }
    //買参人用 掲載中
    if(postBackData.product.ORERBUTTON_STATE == 1 && postBackData.product.OPTION_UPSTATE == 1){
      //カルーセルメッセージの商品情報(最大13件)
      let columns = []
      let productInfoArray, card, pNum = 0
      
      let product_continue = false
      for(let i = property.constPL.rowNum ; i > 0 ; i--){
        //productInfoArray = this.plSheetVals[i]._rawData //spreadsheet
        
        //firestore parameter 値は速度の速いfirestoreから受け取る
        productInfoArray = this.plSheetVals[i] //firestore
        
        //掲載 trueのみ
        if(productInfoArray[property.constPL.columns.upState]){
          //console.log(JSON.stringify(productInfoArray))
          
          //1行目
          if(lineNum){              
            pNum++
            //columnsに情報を格納する
            if(pNum <= 10){ //最初の10枚
              //console.log(title, productInfoArray, this.getPostData(productInfoArray), TIMESTAMP_NEW)
              card = getProductsCarouselForBuyer(title, productInfoArray, this.getPostData(productInfoArray), TIMESTAMP_NEW)
            }
            else{
              product_continue = true
              break;
            }

            if(columns.length < 13) { columns.push(card); }
          }
          //2行目
          else{
            pNum++
            if(pNum > 10){
              card = getProductsCarouselForBuyer(title, productInfoArray, this.getPostData(productInfoArray), TIMESTAMP_NEW)
              if(columns.length < 13) { columns.push(card); }
            }
          }
        }          
      }

      //末尾のカード
      const contentJSON = (textMessage, label, sheetId, tap_text, title, detail) => {

        const postBackData = {
          tag: "productsList",
          command: "",
          product: {
            sheetId: sheetId,
            ORERBUTTON_STATE: 1,
            OPTION_UPSTATE: 1,
            title: title,
            detail: detail
          }
        }
        if(sheetId == this.sheetId){
          postBackData.command = "continuation"
        }

        return {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": textMessage,
              "size": "md",
              "color": "#ffffff",
              "wrap": true,
              "action": action_JSON.getPostbackActionWithText(label, postBackData, tap_text),
            }
          ],
          "backgroundColor": "#905c44",
          "cornerRadius": "xxl",
          "paddingAll": "xl"
        }        
      }

      //1行目、かつ続きの商品がある
      if(lineNum && product_continue){
        let display_next = `${title} の続きを表示`
        let label_next = `${title}の続きを表示`
        let tap_text_next = display_next

        contents.push(contentJSON(display_next, label_next, this.sheetId, tap_text_next, title, detail))                
      }
      else{
        //１つ新しいリスト
        if(nextList !== undefined){
          const title_nextList = nextList[property.constAllList.columns.title]
          const detail_nextList = nextList[property.constAllList.columns.detail]

          const display_nextList = `<< ${title_nextList} を表示` 
          const label_nextList = `${title_nextList} 詳細` //ボタンを押したときにトーク一覧から見えるテキスト
          const sheetId_nextList = nextList[property.constAllList.columns.sheetId] //シートID
          const tap_text_nextList = label_nextList  //ボタンを押したときにトーク画面に表示されるテキスト

          contents.push(contentJSON(display_nextList, label_nextList, sheetId_nextList, tap_text_nextList, title_nextList, detail_nextList))
        }

        //１つ古いリスト
        if(preList !== undefined){
          const title_preList = preList[property.constAllList.columns.title]
          const detail_preList = nextList[property.constAllList.columns.detail]

          const display_preList = `>> ${title_preList} を表示`
          const label_preList = `${title_preList} 詳細`  //ボタンを押したときにトーク一覧から見えるテキスト
          const sheetId_preList = preList[property.constAllList.columns.sheetId] //シートID
          const tap_text_preList = label_preList  //ボタンを押したときにトーク画面に表示されるテキスト
          
          contents.push(contentJSON(display_preList, label_preList, sheetId_preList, tap_text_preList, title_preList, detail_preList))
        }
      }
      card = flexMessage_ForBuyer.getProductInfoContinuationCard(contents)
      if(columns.length < 13) { columns.push(card); }
    
      messagesArray.unshift(message_JSON.getflexCarouselMessage(`商品表示`, columns))
      return messagesArray;
    }
  }

  //商品情報  発注、カートへボタン用
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

  //新在庫取得
  async getNewStock(productId, orderNum){
    if(this.plSheetVals === undefined){await this.getDB()}
    
    const productArray = this.plSheetVals[productId] //更新対象
    const NEWSTOCK = Number(productArray[property.constPL.columns.stockNow]) - Number(orderNum) //新在庫
    return NEWSTOCK
  }  
}
module.exports = Products;

//●商品リスト カルーセルメッセージ(Flex Messge)
const getProductsCarouselForBuyer = (title, productInfoArray, postBackData, TIMESTAMP_NEW) => {
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
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWithText("発注",  postBackDataBuy, `${PRODUCTINFO}を発注`))
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

  return  flexMessage_ForBuyer.getProductCardForBuyer(title, bodyContents, footerContents)
}