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
//商品リスト
module.exports.productsSheetIds = [
  320501540,
  349444130,
  414287395,
  450662181,
  525976409,
  737290665,
  828267981,
  1080037946,
  1201066271,
  1208835130,
  1273554517,
  1336658130,
  1344724153,
  1480572267,
  1693112024,
  1697600268,
  1883943048,
  1891008356,
]
//商品リスト
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
  "sRow" : 2,  //3行目
  "eRow" : 19, //22行目
  
  //エッジの列
  "sColumn" : 0, 
  "eColumn" : 23,

  //行数
  "rowNum" : 20,
  
  //文字数制限
  "strNum" : {"name":45,"size":3,"sizeUnit":10,"quantityPerCase":3
  ,"purchasePrice":5,"sellingPrice":5,"stock":3,"stockNow":3,"botMessage":25} 
}
//商品リストIDs
module.exports.sheetNumber = {
  "320501540":"S1",
  "349444130":"S3",
  "414287395":"S12",
  "450662181":"S10",
  "525976409":"S17",
  "737290665":"S14",
  "828267981":"S15",
  "1080037946":"S16",
  "1201066271":"S18",
  "1208835130":"S9",
  "1273554517":"S7",
  "1336658130":"S13",
  "1344724153":"S4",
  "1480572267":"S6",
  "1693112024":"S8",
  "1697600268":"S11",
  "1883943048":"S2",
  "1891008356":"S5"
}
//発注リスト
module.exports.constOL = {
  //属性と列
  "columns": {
    "orderday":0,//発注日時
    "deliveryday":1,//希望市場納品日
    "MARKET_ID":2,//買参人コード
    "BRANCH_NUM":3,//買参人枝番号
    "buyerName":4,//買参人名称
    "janCode":5,//JANコード
    "pId":6,//商品ID
    "salesPerson":7,//産地担当
    "pnumA":8,//出荷者親番号
    "pnumB":9,//出荷者枝番号
    "producerName":10,//出荷者名
    "prductCode":11,//商品マスタコード
    "prductName":12,//商品名
    "size":13,//サイズ
    "sizeUnit":14,//サイズ単位
    "quantityPerCase":15,//入数
    "orderNum":16,//希望口数
    "purchasePrice":17,//単価
    "sellingPrice":18,//単価
    "systemInputOrderNow":19,//受注入力中
    "systemInputOrder":20,//受注入力済
    "log":21,//ログ
  },

  //列数
  "colNum": 22,

  //発注情報列数
  "orderColNum": 19,

  //データ範囲
  "sRow": 0,
  "sColumn": 1,
  "eColumn": 22,
}