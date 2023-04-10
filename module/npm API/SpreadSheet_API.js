//●●●スプレッドシート API●●●
const SECRET = require("./secret.js");
const {GoogleSpreadsheet} = require("google-spreadsheet");  
const property = require("../property.js");


//初期化
const initializeSpreadsheet = async (SSID) => {
  try{
    const creds = JSON.parse(await SECRET.getString(process.env.SPREADSHHET_SEVICE_ACCOUNT_NAME, process.env.SPREADSHHET_SEVICE_ACCOUNT_VERSION))
    const SpreadSheet = new GoogleSpreadsheet(SSID)
    await SpreadSheet.useServiceAccountAuth(creds);
    await SpreadSheet.loadInfo()
    console.log(`${SpreadSheet.title} 初期化完了`)
    return SpreadSheet    
  } catch(e){
    console.error(e)
  }
}


//スプレッドシート ドキュメント instance
module.exports.dbSS_ProductsList = {
  doc: null,
  sheet: {
    sheetId: "obj"
  },
  vals: {
    sheetId: "obj"
  }
}
//dbSS_ProductsList.sheetId[]
module.exports.dbSS_OrderList = {
  doc: null,
  sheet: {
    sheetId: "obj"
  },
  vals: {
    sheetId: "obj"
  },
  rowNum: 0
}


//値更新
module.exports.upDateSpreadSheet_ProductsList = async (sheetId) => {
  try{
    //初期化
    if(module.exports.dbSS_ProductsList.doc === null){
      module.exports.dbSS_ProductsList.doc = await initializeSpreadsheet(process.env.SPREADSHEETID_PRODUCTS)      
    }

    //シート取得
    module.exports.dbSS_ProductsList.sheet[sheetId] = module.exports.dbSS_ProductsList.doc.sheetsById[sheetId]
    //console.log(`シート: ${module.exports.dbSS_ProductsList.sheet[sheetId].title}`)
    if(module.exports.dbSS_OrderList.sheet[0] !== undefined || module.exports.dbSS_OrderList.sheet[0] !== null){
      //ヘッダー行読み込み
      await module.exports.dbSS_ProductsList.sheet[sheetId].loadHeaderRow(property.constPL.headersRow);

      //行読み込み
      const range_stockNow = "O3:O22"
      module.exports.dbSS_ProductsList.vals[sheetId] = await module.exports.dbSS_ProductsList.sheet[sheetId].loadCells(range_stockNow)
    }
    //console.log(`値更新取得完了`)
  }catch(e){
    console.error(e)
  }
  return
}
module.exports.upDateSpreadSheet_OrderList = async () => {  
  try{
    //初期化
    if(module.exports.dbSS_OrderList.doc === null){
      console.log(`${module.exports.dbSS_OrderList.doc}`)
      module.exports.dbSS_OrderList.doc = await initializeSpreadsheet(process.env.SPREADSHEETID_ORDER)
      console.log(`${module.exports.dbSS_OrderList.doc}`)
    }

    //シート取得
    module.exports.dbSS_OrderList.sheet[0] = module.exports.dbSS_OrderList.doc.sheetsById[0]
    //console.log(`シート: ${module.exports.dbSS_OrderList.sheet[0].title}`)
    if(module.exports.dbSS_OrderList.sheet[0] !== undefined || module.exports.dbSS_OrderList.sheet[0] !== null){
      //行読み込み
      module.exports.dbSS_OrderList.vals[0] = await module.exports.dbSS_OrderList.sheet[0].getRows()
      
      module.exports.dbSS_OrderList.rowNum = module.exports.dbSS_OrderList.vals[0].length
      console.log(`--全発注件数: ${module.exports.dbSS_OrderList.rowNum}`)      
    }
  } catch(e){    
    console.error(e)
  }
  return
}