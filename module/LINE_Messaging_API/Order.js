//単品発注/複数発注併用 メソッド群
//TODO: スキップ certification と check の混合解消

/* eslint-disable one-var */
const property = require("../property.js");
const timeMethod = require("../getTime.js");
const Products = require("../class ProductsList.js");

const action_JSON = require("./Action_JSON.js");
const message_JSON = require("./message_JSON.js");
const Irregular = require("./Irregular.js");
const StampMessage = require("./Class Stamp.js");

//●希望口数伺い
async function selectOrderNum(spSheetId1, postBackData) {
  let messagesArray = [], items = []

  //商品情報 現在庫取得
  const plSheet= new Products(spSheetId1, postBackData.product.sheetId)
  const masterProductArray = await plSheet.getRowData(postBackData.product.productId)
  
  //在庫確認
  const stockNow = masterProductArray[property.constPL.columns.stockNow]  
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
        "action": action_JSON.getPostbackActionWithText(i, postBackData,  i + "口")              
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

//●商品情報チェック
//商品リストと一致するか照合
//比較対象：商品名、出荷者、サイズ入数販売単価
function certificationProductInfo(postBackData, masterProductArray){
  //console.log(`照合 postBackData - SS情報`)
  const mData = getTextbyMasterData(masterProductArray)
  const pData = getTextbyPostData(postBackData)
      
  //console.log(`--mData : ${mData}`)
  //console.log(`--pData : ${pData}`)
  //console.log(`--upState : ${masterProductArray[property.constPL.columns.upState]}`)
  
  //商品情報がリストと一致しないとき、または未掲載のとき
  if(mData != pData || masterProductArray[property.constPL.columns.upState] === false){
    //console.log(`--商品リストとpostBackDataを照合 不一致,または未掲載`)
    return true
  }
  else{
    //console.log(`--商品リストとpostBackDataを照合 一致`)
    return false
  }
}

//●商品情報 スプレッドシート情報 照合用テキスト取得
function getTextbyMasterData(masterProductArray){
  return masterProductArray[property.constPL.columns.numA] + "-" + masterProductArray[property.constPL.columns.numB] +
    //masterProductArray[property.constPL.columns.name].replace(/\n/g, "") +
    masterProductArray[property.constPL.columns.name] +
    masterProductArray[property.constPL.columns.norm]
}

//●商品情報 postBackData 照合用テキスト取得
function getTextbyPostData(postBackData){
  return postBackData.product.producer.split(" ")[0] +
  postBackData.product.name + postBackData.product.norm
}
  
//●納品日 テキストチェック deliveryday:yyyy-mm-dd
function chechkTextDeliveryday(deliveryday_FMT_LINE){
  //Dateか否か
  const date = new Date(deliveryday_FMT_LINE)
  if(isNaN(date)){
    console.log(`--納品期間 テキスト`)
    return [true, ""]
  }
  else{
    console.log(`--納品期間 テキストでない`)
    return [false, date]
  }
}

//●納品日 荷受け日、ブロック日チェック
/*  
  input:Dateクラス
  output:['yy/mm/dd(day), checkState]
*/
function certificationDeliveryday(date){
  console.log(``)
  const BEFORE_UNIXTTIME = date.getTime()
  
  //荷受け日を競り日に
  const AFTER_UNIXTTIME = timeMethod.getNextAuctionDay(BEFORE_UNIXTTIME, 0)
  //console.log(`荷受け日チェック後 unixTime : ${AFTER_UNIXTTIME}`)
  //console.log(`荷受け日チェック後 年/月/日 : ${new Date(AFTER_UNIXTTIME)}`)

  //ブロック日チェック 次の競り日に 
  //ブロック日を納品期間に設定しないようにすればいい。メンテ不要になるので。
  /*
  //let thisDateYear  = aunixTime.getFullYear()
  //let thisDateMonth = aunixTime.getMonth() + 1
  //let thisDate      = aunixTime.getDate()

  //シート「ブロック日」クラス定数    
  const blockDate = ""//JSON.parse(prop.getProperty("blockDate")) 
  //SpreadSheet → fireStore
  
  //属性と列番号
  const blockDateCols = {"日付":1, "備考":2, "年":3, "月":4, "日":5}

  for(var i in blockDate){
    let year = blockDate[i][blockDateCols.年 - 1]
    let month    = blockDate[i][blockDateCols.月 - 1]
    let date     = blockDate[i][blockDateCols.日 - 1]
  
    //console.log(`ブロック日 年/月/日 : ${year}/${month}/${date}`)
    if(thisDate == date && thisDateMonth == month && thisDateYear == year){
      aunixTime = timeMethod.getNextAuctionDay(aunixTime,1)
    }
  }
  console.log(`ブロック日チェック 年/月/日 :${new Date(AFTER_UNIXTTIME)}`)
  */

  const AFTER_DATE = timeMethod.getFmtDateForLINE(new Date(AFTER_UNIXTTIME))
  let CHANGE_STATE, CHANGE_STATE_TEXT
  if(AFTER_UNIXTTIME != BEFORE_UNIXTTIME){
    CHANGE_STATE = true, CHANGE_STATE_TEXT = "変更あり"
  }
  else{
    CHANGE_STATE = false, CHANGE_STATE_TEXT = "変更なし"
  }
  console.log(`納品日 荷受け日、ブロック日チェック後: ${AFTER_DATE}, ${CHANGE_STATE_TEXT}`)
  return [AFTER_DATE, CHANGE_STATE]
}

//●納品日 納品期間チェック
//from yyyy-mm-dd, yyyy-mm-dd, yyyy-mm-dd
//to text, changeState:true: , false: 
function certificationdeliveryPeriod(deliveryday, SD_FMT_LINE, ED_FMT_LINE){
  console.log(``)
  console.log(`納品日 納品期間チェック`)
  let text, changeState = false
  
  //納品期間確認
  const d = deliveryday.split("-")  //yyyy-mm-dd
  const SD_FMT_LINE_Array = SD_FMT_LINE.split("-")
  const ED_FMT_LINE_Array = ED_FMT_LINE.split("-")

  //納品日
  let year = Number(d[0]), month = Number(d[1]) - 1, date = Number(d[2])
  //console.log(`year:%s, month:%s, date:%s`, year, month, date)
  let deliveryDate= new Date(year, month, date, 0, 0, 0)
  const unixD =  deliveryDate.getTime()

  //納品開始日
  const sDDate = new Date(SD_FMT_LINE_Array[0], SD_FMT_LINE_Array[1] - 1, SD_FMT_LINE_Array[2], 0, 0, 0)
  //const unixsD =  timeMethod.getDateFMSpreadSheetToLINE(sD, "unix")
  const unixsD =  sDDate.getTime()

  //納品終了日
  const eDDate = new Date(ED_FMT_LINE_Array[0], ED_FMT_LINE_Array[1] - 1, ED_FMT_LINE_Array[2], 0, 0, 0)
  //const unixeD =  timeMethod.getDateFMSpreadSheetToLINE(eD, "unix")
  const unixeD =  eDDate.getTime()

  //判定
  if(unixD < unixsD  || unixeD < unixD){
    console.log(`-納品期間 外`)
    //納品日書き換え
      text = "納品期間外のため、再指定してください。"
      changeState = true
      console.log("--納品開始日:" + sDDate + "  unix:" + unixsD)
      console.log("--希望納品日:" + deliveryDate + "  unix:" + unixD)
      console.log("--納品終了日:" + eDDate + "  unix:" + unixeD)
  }
  else{
    console.log(`-納品期間 内`)
    //FMT変更
    text = deliveryday
  }
  return [text, changeState]
}

//●発注確定後メッセージ
function replyOrderConfirmTextMessage(STATE_ORDERHIS){
  let messagesArray = [], buff;
  
  //発注あり
  if(STATE_ORDERHIS[0] > 0){
    let textMessage = "以下" + STATE_ORDERHIS[0] + "件の発注が完了しました。\n\n" 
      //+ "※「発注確定」後のキャンセル・変更については、直接市場へお問い合わせくださいませ。"
    
    for (buff of STATE_ORDERHIS[1]){
      textMessage += buff + "\n\n"
    }

    textMessage += "またのご利用をお待ちしております。"

    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().ありがとう);
  }
  return messagesArray
}

module.exports = {
  selectOrderNum,
  certificationProductInfo,
  chechkTextDeliveryday,
  certificationDeliveryday,
  certificationdeliveryPeriod,
  replyOrderConfirmTextMessage
}