/* eslint-disable one-var */
const functions = require('firebase-functions');
const logger = functions.logger

//●●●スプレッドシート API●●●
const {GoogleSpreadsheet} = require("google-spreadsheet");  
const AsyncLock = require(`async-lock`);

const property = require("../property.js");
const SECRET = require("./secret.js");

const max_retryTime = 5 //再試行最大回数
const retryDelayTime = 100 //再試行遅延時間 ms

//排他制御
const lock = new AsyncLock({
  //timeout: 60*1000, // タイムアウトを指定 - ロックを取得する前にアイテムがキューに留まることができる最大時間
  //maxOccupationTime: 60*1000, // 最大占有時間を指定 - キューに入ってから実行を完了するまでの最大許容時間
  maxExecutionTime: 5*60*1000, // 最大実行時間を指定 - ロックを取得してから実行を完了するまでの最大許容時間
  //maxPending: 10 // 保留中のタスクの最大数を設定 - 一度にキューで許可されるタスクの最大数
});

//初期化
const initializeSpreadsheet = async (SSID, retryTime = 1) => {
  const func_content = "-SpreadSheet 初期化"
  try {
    logger.log(`${func_content} 開始 ${retryTime}回目`)
    
    const creds = JSON.parse(await SECRET.getString(process.env.SPREADSHHET_SEVICE_ACCOUNT_NAME, process.env.SPREADSHHET_SEVICE_ACCOUNT_VERSION))    
    const doc = new GoogleSpreadsheet(SSID)
    await doc.useServiceAccountAuth(creds)   
    logger.log(`${func_content} サービスアカウント 認証完了`)
    
    //ドキュメントロード
    await doc.loadInfo()
    logger.log(`${func_content} ${doc.title} ドキュメントロード 完了`)    
    return doc
  } catch (err) {
    logger.warn(`${func_content} ${retryTime}回目 エラー`)

    if (retryTime == max_retryTime) throw err  //再試行終了

    //再試行
    await new Promise(resolve => setTimeout(resolve, retryDelayTime)); //待機
    return await initializeSpreadsheet(SSID, retryTime + 1);
  }
}

//商品リスト 取得
const getProductsList = async (productsList_doc, sheetId, retryTime = 1) => {
  const func_content = `-商品リスト ${property.sheetNumber[sheetId]}`
  try {
    logger.log(`${func_content} 取得開始 ${retryTime}回目`)

    //シート取得
    const sheet = productsList_doc.sheetsById[sheetId]
      
    //ヘッダー行ロード
    await sheet.loadHeaderRow(property.constPL.headersRow);
    
    //セルロード
    const range_stockNow = "O3:O22"
    await sheet.loadCells(range_stockNow)    
    logger.log(`${func_content} | シート: ${sheet.title} ロード完了`)

    logger.log(`${func_content} 取得完了`)
    return sheet
  } catch (err) {
    logger.warn(`${func_content} ${retryTime}回目 エラー`)
        
    if (retryTime == max_retryTime) throw err  //再試行終了
    
    //再試行
    await new Promise(resolve => setTimeout(resolve, retryDelayTime)); //待機    
    return await getProductsList(productsList_doc, sheetId, retryTime + 1);
  }
}

//スプレッドシート 商品リスト 現在庫更新
const setNewStocksToSpreadSheet = async (productsList_doc, plSheets, retryTime = 1) => {
  const func_content = "-商品リスト 現在庫登録"
  try{
    logger.log(`${func_content} 開始 ${retryTime}回目`)
    for(let sheetId in plSheets){      
      //シート取得
      const sheet = await getProductsList(productsList_doc, sheetId)

      //値埋め込み
      for(let buff of plSheets[sheetId].order){
        //更新行
        let ROW = Number(property.constPL.sRow) + Number(buff.pId) - 1

        //セル操作
        sheet.getCell(ROW, property.constPL.columns.stockNow).value = buff.newStock
        logger.log(`--行 ${ROW} 現在庫 ${buff.newStock} 入力`)
      }

      //スプレッドシート更新
      await sheet.saveUpdatedCells(); // save all updates in one call
      logger.log(`--シート: ${sheet.title} 更新`)      
    }

    return logger.log(`${func_content} 完了`)    
  } catch (err) {
    logger.warn(`${func_content} ${retryTime}回目 エラー`)

    if (retryTime == max_retryTime) throw err  //再試行終了
    
    //再試行
    await new Promise(resolve => setTimeout(resolve, retryDelayTime)); //待機
    return await setNewStocksToSpreadSheet(productsList_doc, plSheets, retryTime + 1);
  }
}

//商品リストアクセス
module.exports.accessProductsList = async (command, sheetId, plSheets) =>{
  const key = "商品リスト操作"
  return await lock.acquire(key, async () => {
    logger.log(`★${key} 開始`)

    //初期化
    const productsList_doc = await initializeSpreadsheet(process.env.SPREADSHEETID_PRODUCTS)      

    if(command == "get"){
      await getProductsList(productsList_doc, sheetId)
    }
    else if(command == "setNewStock"){
      await setNewStocksToSpreadSheet(productsList_doc, plSheets)
    }
    return logger.log(`★${key} 完了`)    
  })
}

//シート取得
const getOrderList = async (orderList_doc, retryTime = 1) => {
  const func_content = `-発注リスト取得`
  try {
    logger.log(`${func_content} 開始 ${retryTime}回目`)

    //シート取得
    const sheet = await orderList_doc.sheetsById[0]
    
    //行ロード
    const vals = await sheet.getRows()
    logger.log(`--全発注件数: ${vals.length}`)

    logger.log(`${func_content} 完了`)
    return [sheet, vals]
  } catch (err) {
    logger.warn(`${func_content} ${retryTime}回目 エラー`)
    
    if (retryTime == max_retryTime) throw err
    await new Promise(resolve => setTimeout(resolve, retryDelayTime)); //待機
    return await getOrderList(orderList_doc, retryTime + 1);
  }
}

//発注情報挿入
const insertOrderRecord = async (orderList_doc, ordersArray, retryTime = 1) => {
  const func_content = "-SpreadSheet 発注情報登録"
  try {
    logger.log(`${func_content} 開始 ${retryTime}回目`)
    //シート取得
    const [sheet, vals] = await getOrderList(orderList_doc)
    
    const STARTINDEX = property.constOL.sRow + 1 //挿入始端行 0(1行目), 1(2行目), 2(3行目)....
    const ENDINDEX = ordersArray.length + STARTINDEX  //挿入終端行 挿入始端行＋挿入行数
    logger.log(`--発注リストへ登録 挿入始端行 : ${STARTINDEX}   挿入終端行 : ${ENDINDEX}`)
    
    //空白行を挿入
    await sheet.insertDimension(
      "ROWS",
      {
        startIndex : STARTINDEX,
        endIndex   : ENDINDEX,
      },
      false
    )
    logger.log(`--空白行を挿入`)
    
    //値を入力 保存
    const p = []
    for(let i = 0; i < ordersArray.length; i++){
      vals[i]._rawData = await ordersArray[i]
      await vals[i].save({raw : false})
    }
    logger.log(`--値入力`)

    logger.log(`${func_content} 完了`)
    return

  } catch (err) {
    logger.warn(`${func_content} ${retryTime}回目 エラー`)
    
    if (retryTime == max_retryTime) throw err  //再試行終了

    //再試行
    await new Promise(resolve => setTimeout(resolve, retryDelayTime)); //待機
    return await insertOrderRecord(orderList_doc, ordersArray, retryTime + 1);
  }
}

//発注リストアクセス
module.exports.accessOrderList = async (command, ordersArray) =>{
  const key = "発注リスト操作"    
  return await lock.acquire(key, async () => {
    logger.log(`★${key} 開始`)

    //初期化
    const orderList_doc = await initializeSpreadsheet(process.env.SPREADSHEETID_ORDER)  

    //発注情報取得
    if(command == "get"){
      await getOrderList(orderList_doc)
    }
    //発注情報挿入
    else if(command == "insertOrder"){      
      await insertOrderRecord(orderList_doc, ordersArray)
    }
    logger.log(`★${key} 完了`)
    return
  })
}