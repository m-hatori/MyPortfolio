//const other_api = require("./other_api.js");

//NEWアイコンURL
module.exports.newItemIcon = "https://drive.google.com/uc?id=13uBfNTFoLoZ-jlhYxpoQ0XC1r6pNrpLq"

//●●●グローバル定数●●●
//商品リスト一覧 マトリクス
module.exports.constallList = {
    //属性と列番号"商品リスト"	画像	掲載	"文字数確認"
    "columns":{"number":0,"group":1,"upState":2,"title":3,"detail":4,"upDate":5
,"sheetId":6,"picFolferID":7,"sheetLink":8,"picFilderLink":9},

    //列数
    "colNum":13,

    //データ範囲
    //エッジの行
    "sRow":2, //始端行
    "eRow":19, //終端行

    //エッジの列
    "sColumn":0,
    "eColumn":9,

    //行数
    "rowNum":18,
}

//SS「商品リスト」クラス定数
//SSPL 商品リスト
module.exports.constPL = {

  //属性と列番号
  "columns" : {"productId":0,"numA":1,"numB":2,"producerName":3,"shortestDeliveryDate":4,"salesStaffName":5
  ,"productCode":6,"name":7,"size":8,"sizeUnit":9,"quantityPerCase":10
  ,"purchasePrice":11,"sellingPrice":12,"stock":13,"stockNow":14,"sDeliveryday":15
  ,"eDeliveryday":16,"picUrl":17,"upState":18
  ,"upDate":19,"norm":20,"deliveryPeriod":21, "botMessage":22,"judgeNew":23} ,

  //列数
  "colNum" : 24,

  //データ範囲
  //エッジの行
  "headersRow" : 2,  //2行目
  "sRow" : 0,  //ヘッダーの次の行が0。3行目
  "eRow" : 19, //ヘッダーの次の行が0。22行目
  
  //エッジの列
  "sColumn" : 0, 
  "eColumn" : 23,

  //行数
  "rowNum" : 20,
  
  //文字数制限
  "strNum" : {"name":45,"size":3,"sizeUnit":10,"quantityPerCase":3
  ,"purchasePrice":5,"sellingPrice":5,"stock":3,"stockNow":3,"botMessage":25} 
}

//SSPL 納品日更新パターン
module.exports.constDP = {
    //属性と列番号
    "columns":{"パターンNo":0,"発注締切日":1,"集荷日":2,"競り日":3,"翌競り日":4,"最短納品日数":5,"備考":6},
    "colNum":7,
    "sRow":1,
    "sColumn":0,
    "eColumn":6        
}

//module.exports.constDPVals = JSON.parse(prop.getProperty("constDPVals")) //GAS→firesotre

//●スプレッド ユーザーリスト シート名
module.exports.spSheetId2sheetNames = {"user": "ユーザーリスト","buyer":"買参人","producer":"出荷者","admin":"管理者"}

//●スプレッド 発注リスト シート名
module.exports.spSheetId3sheetNames = {"orderList":"発注リスト","BlockDay":"ブロック日","producerList":"メーリングリスト"}
module.exports.userClasses ={"common":"一般","buyer":"買参人","producer":"出荷者","admin":"管理者", "block":"ブロック"}

//シート「発注リスト」クラス定数
module.exports.constSSOL = {
  "sheetNames": {"orderList":"発注リスト","BlockDay":"ブロック日","mailList":"メーリングリスト"}
}

/*
//●●●RichMenu IDs 公式用●●●
//メインメニュー
module.exports.mainMenuId = {
  forCommon   :"richmenu-f9d97f26527c658a2f844967ce647ec2",
  forProducer :"richmenu-0936e05176b875ee656bda464e395dc3",
  forBuyer    :"richmenu-c24235561b4ddee9625c2b4549e8a0d4",
  forAdmin    :"richmenu-654537a089fd63ce397711ec99e8b254"
}

//買い物かごエラー
module.exports.cartErrMenu =  "richmenu-4589661cf9f94d905613d82ce55f4337"

//買参人用メインメニュー(買い物かご内商品数別) 公式用
module.exports.cartNum = {
  0:"richmenu-c24235561b4ddee9625c2b4549e8a0d4",
  1:"richmenu-5406d7bec47a75d65ee9d75c75a32bdf", 
  2:"richmenu-9c11408b8dd0fa78c127d950ee1d84eb", 
  3:"richmenu-422e31b536c3b413370674264e8e8690", 
  4:"richmenu-e72a4f2797a919d9d635b9019390c780", 
  5:"richmenu-63e9429058ee982c31ca592808add673", 
  6:"richmenu-9f3dbe028631c0a72d6ee72926c6de0a", 
  7:"richmenu-451f3bf533232e15471a99b3dd13b43c", 
  8:"richmenu-f9a4a0b28e7bd9a7b68162322554a377", 
  9:"richmenu-137edc529dcf4c78c4e3f796cd67a835", 
  10:"richmenu-ee279e312eee12aec5c3fdcd50b7f9e9", 
}
*/

//●●●RichMenu IDs テスト用●●●
//メインメニュー
module.exports.mainMenuId = {
  forCommon   :"richmenu-0745b1ea66b1c48a15c295342106711d",
  forProducer :"richmenu-0936e05176b875ee656bda464e395dc3",
  forBuyer    :"richmenu-a995688cf99d72530c03a1bf1feb2d1e",
  forAdmin    :"richmenu-591248b79b1eb606a7aac476370ce78c" 
}

//買参人用メインメニュー(買い物かご内商品数別)  テスト用
module.exports.cartNum ={
  0:"richmenu-a995688cf99d72530c03a1bf1feb2d1e",
  1:"richmenu-2206d13a1c7353242a7ae78d2a105df2",
  2:"richmenu-8fe818a702ac35978a8b0f8207217293",
  3:"richmenu-57ff61e77cad1007f6e64ce85bbd99cd",
  4:"richmenu-bdde49faa07a8756d0f83d66e4951056",
  5:"richmenu-78dabdae24dd401cfc624dfe0cb50fc8",
  6:"richmenu-54333f32d202f6909a4f3d650f724146",
  7:"richmenu-67ae3ee4a7d97525dcd69c5d1123d03c",
  8:"richmenu-c4d1b5dbd2a8a1ff7a5e6a9a9a728aa7",
  9:"richmenu-efa199083d2115afba294f9c2939b8cc",
  10:"richmenu-3da6613414970c65ded0295c69755069",
}

/*
//買い物かごメニュー テスト用
module.exports.cartMenu = { 
  "1":"richmenu-4a45aec28b528e554cc950f0b4a83e4a", 
  "2":"richmenu-388f50796e0fdff7b0ebea5948db825a",
  "3":"richmenu-840f292b8e826d58ffa9e392d8874e8e", 
  "4":"richmenu-e6773c21fc668cb47480a9dde53e8fde", 
  "5":"richmenu-7db1262531fc286f5e3164db36c376e1", 
  "6":"richmenu-06d2109d5cc1bcab4ed35634eff7b03d", 
  "7":"richmenu-480f1c928b2a26ca00deb1339e966483", 
  "8":"richmenu-95c5c8e368c532a3759a8fef05b2edf7",
  "9":"richmenu-dedadb22252cd22f6f9537b4fbe6f9c6",
  "10":"richmenu-15426da8397be0ce7e4aabb91d3f34b5",
}

//アロー関数
function abc(val){retrun val*2}

const abc = (val) => {retrun val*2}

引数が1つの時
const abc = val => {retrun val*2}

関数内が1行で表現できるとき
const abc = val => val*2

*/