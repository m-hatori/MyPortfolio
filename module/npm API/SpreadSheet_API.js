/* eslint-disable one-var */

//●●●スプレッドシート API●●●
const {GoogleSpreadsheet} = require("google-spreadsheet");  
const property = require("../property.js");

const AsyncLock = require(`async-lock`);

//排他制御
const lock = new AsyncLock({
  //timeout: 60*1000, // タイムアウトを指定 - ロックを取得する前にアイテムがキューに留まることができる最大時間
  //maxOccupationTime: 60*1000, // 最大占有時間を指定 - キューに入ってから実行を完了するまでの最大許容時間
  maxExecutionTime: 5*60*1000, // 最大実行時間を指定 - ロックを取得してから実行を完了するまでの最大許容時間
  //maxPending: 10 // 保留中のタスクの最大数を設定 - 一度にキューで許可されるタスクの最大数
});

//初期化
const initializeSpreadsheet = async (SSID) => {
  const doc = new GoogleSpreadsheet(SSID)

  //??
  const SECRET = require("./secret.js");
  const creds = JSON.parse(await SECRET.getString(process.env.SPREADSHHET_SEVICE_ACCOUNT_NAME, process.env.SPREADSHHET_SEVICE_ACCOUNT_VERSION))
  await doc.useServiceAccountAuth(creds)

  //ボリュームとしてマウント 未実施
  //const fs = require('fs')
  //const creds = JSON.parse(fs.readFileSync("./etc/secret/ss_sa", 'utf8'))
  //await doc.useServiceAccountAuth(creds)

  //環境変数 できない
  //await doc.useServiceAccountAuth({
  //   client_email: process.env.SPREADSHEET_SERVICE_ACCOUNT_EMAIL,
  //  private_key: process.env.SPREADSHEET_PRIVATE_KEY,
  //});

  await doc.loadInfo()
  console.log(`★${doc.title} 初期化完了`)
  return doc
}

//キャッシュ
module.exports.productsList ={
  doc: null,
  /*
  sheetId:{
    sheet: null,
    vals: null
  }
  */
};


//商品リスト 取得
module.exports.getProductsList = async (sheetId, state) => {
  const key = "商品リスト 取得"
  return await lock.acquire(key, async () => {
    console.log(`${key} Lock Function Start`);
    let doc, sheet
    //スプレッドシートドキュメント 初期化
    if(module.exports.productsList.doc === null){
      //module.exports.productsList.doc = await initializeSpreadsheet(process.env.SPREADSHEETID_PRODUCTS)
      doc = await initializeSpreadsheet(process.env.SPREADSHEETID_PRODUCTS)
      //キャッシュ保存
      module.exports.productsList.doc = doc
    }
    else{
      doc = module.exports.productsList.doc
    }    

    //シート取得
    if( module.exports.productsList[sheetId] === undefined || state){

      //シート取得
      sheet = doc.sheetsById[sheetId]
      
      //ヘッダー行ロード
      await sheet.loadHeaderRow(property.constPL.headersRow);
      
      //セルロード
      const range_stockNow = "O3:O22"
      await sheet.loadCells(range_stockNow)    
      console.log(`シート: ${sheet.title} ロード完了`)

      //キャッシュ保存      
      module.exports.productsList[sheetId] ={ sheet: sheet }
    }
    else{
      sheet = module.exports.productsList[sheetId].sheet
    }
    console.log(`シート: ${sheet.title} 取得完了`)
    console.log(`${key} Lock Function End`);
    return sheet
  });
}

//スプレッドシート 単品在庫更新
//新規在庫 NEWSTOCK: firestoreに書き込んだ値を使い、整合性を保つ
const setNewStockToSpreadSheet = async (sheet, productId, NEWSTOCK) => {
  //更新行
  const ROW = Number(property.constPL.sRow) + Number(productId) - 1

  //セル操作
  const CELL_STOCKNOW = sheet.getCell(ROW, property.constPL.columns.stockNow)
  CELL_STOCKNOW.value = NEWSTOCK
  console.log(`シート: ${sheet.title} 値入力`)
  return
}

//スプレッドシート 商品リスト 複数更新
module.exports.setNewStocksToSpreadSheet = async (plSheets) => {
  const ps = []
  const key = "商品リスト 在庫更新"
  for(let sheetId of property.productsSheetIds){
    if((plSheets[sheetId] !== undefined) &&
        JSON.stringify(plSheets[sheetId].order) != JSON.stringify([])
    ){
      //シート取得
      const sheet = await module.exports.getProductsList(sheetId, true)

      return await lock.acquire(key, async () => {
        console.log(`${key} Lock Function Start`);
        
        //値埋め込み
        const p = []
        for(let buff of plSheets[sheetId].order){
          p.push(setNewStockToSpreadSheet(sheet, buff.pId, buff.newStock))
        }

        //スプレッドシート更新
        if(p.length > 0){
          await Promise.all(p)
          ps.push(sheet.saveUpdatedCells()); // save all updates in one call
          console.log(`シート: ${sheet.title} 更新`)
        }

        console.log(`${key} Lock Function End`);
      });
    }
  }

  await Promise.all(ps)
  return
}


module.exports.orderList = {
  doc: null,
  /*
  sheetId:{
    sheet: null,
    vals: null
  }
  */
};

//発注情報取得
const getOrderList = async (state) => {
  const key = "発注情報取得"
  return await lock.acquire(key, async () => {
    console.log(`${key} Lock Function Start`);
    let doc

    //スプレッドシートドキュメント 初期化
    if(module.exports.orderList.doc === null){
      doc = await initializeSpreadsheet(process.env.SPREADSHEETID_ORDER)
      module.exports.orderList.doc = doc
    }
    else{
      doc = module.exports.orderList.doc
    }

    //シート取得
    const sheetId = 0
    let sheet, vals
    if( module.exports.orderList[sheetId] === undefined || state){

      //シート取得
      sheet = doc.sheetsById[sheetId]
      
      //行ロード
      vals = await sheet.getRows()      

      //キャッシュ保存
      module.exports.orderList[sheetId] = {
        sheet: sheet,
        vals: vals
      }
    }
    else{
      vals = module.exports.orderList[sheetId].vals
    }

    console.log(`--全発注件数: ${vals.length}`)
    console.log(`${key} Lock Function End`);
    return vals
  });
}

//発注情報挿入
module.exports.insertOrderRecord = async (ordersArray) => {
  const key = "発注情報挿入"
  return await lock.acquire(key, async () => {
    console.log(`${key} Lock Function Start`);

    //スプレッドシートドキュメント 初期化
    let doc
    if(module.exports.orderList.doc === null){
      doc = await initializeSpreadsheet(process.env.SPREADSHEETID_ORDER)
      module.exports.orderList.doc = doc
    }
    else{
      doc = module.exports.orderList.doc
    }

    //シート取得
    const sheetId = 0    
    const sheet = doc.sheetsById[sheetId]
    
    //行ロード
    let vals = await sheet.getRows()
    console.log(`--全発注件数: ${vals.length}`)
    
    const STARTINDEX = property.constOL.sRow + 1 //挿入始端行 0(1行目), 1(2行目), 2(3行目)....
    const ENDINDEX = ordersArray.length + STARTINDEX  //挿入終端行 挿入始端行＋挿入行数
    console.log(`-発注リストへ登録 挿入始端行 : ${STARTINDEX}   挿入終端行 : ${ENDINDEX}`)
    
    //空白行を挿入
    await sheet.insertDimension(
      "ROWS",
      {
        startIndex : STARTINDEX,
        endIndex   : ENDINDEX,
      },
      false
    )
    console.log(`--空白行を挿入`)
    
    //値を入力 保存
    const p = []
    for(let i = 0; i < ordersArray.length; i++){
      vals[i]._rawData = await ordersArray[i]
      p.push(vals[i].save({raw : false}))
    }
    console.log(`--値入力`)

    //スプレッドシート キャッシュの更新
    await Promise.all(p)
    vals = await sheet.getRows()
    console.log(`--全発注件数: ${vals.length}`)

    //キャッシュ保存
    module.exports.orderList[sheetId] = {
      sheet: sheet,
      vals: vals
    }
    console.log(`${key} Lock Function End`);
    return
  })
}

module.exports.accessProductsList = async (sheetId, command) =>{

}

module.exports.accessOrderList = async (command, state, ordersArray) =>{
  const key = "発注情報取得"
  return await lock.acquire(key, async () => {
    if(command == "get"){
      return await getOrderList(state)
      
    }
    else if( command == "insertOrder"){
      return await getOrderList(state)    
    }    
  })
}