//●●●スプレッドシート API●●●
const SECRET = require("./secret.js");
const {GoogleSpreadsheet} = require("google-spreadsheet");  

//スプレッドシート 取得
module.exports.getSpreadSheet = async (spSheetId) => {
    const jsonfile = JSON.parse(await SECRET.googleDrive_serviceAccount())
    const doc = new GoogleSpreadsheet(spSheetId);
    await doc.useServiceAccountAuth(jsonfile);
    await doc.loadInfo();
    //console.log("スプレッドシート「" + doc.title + "」取得");    
    //const sheet = doc.sheetsByIndex[0];
    //const sheet = doc.sheetsByTitle["シート1"]
    //const sheet = doc.sheetsById[id]
    return doc
}