//11/29 Done

//単品発注 ポストバックデータ ラベルと配列番号
//postBackTag-Num-timeStadmp∫シートID∫商品ID∫出荷者親番号∫出荷者枝番号∫商品名∫サイズ∫単位∫入数∫仕入単価∫販売単価∫on希望口数∫希望市場納品日
//const postBackDataLabels{"postbackCode":0,"sheetId":1,"productId":2,"numA":3,"numB":4,"name":5,"size":6,"sizeUnit":7,"quantityPerCase":8,"purchasePrice":9,"sellingPrice":10,"orderNum":11,"deliveryday":12}

//postBackData=postBackTag-Num-CartNo-timeStamp∫sheetID∫商品ID∫出荷者情報∫商品名∫規格
//∫新規発注 or 単品発注 発注ボタン押下後:0, 再発注：1, 単品発注 発注ボタン押下後口数 or 納品日変更:2 ∫on希望口数（20文字）∫希望市場納品日（20文字）
const postBackDataLabels = {"postbackCode":0,"sheetId":1,"productId":2,"producer":3,"name":4,"norm":5,"orderState":6,"orderNum":7,"deliveryday":8, "newOrderNum":9}

//postBackコード
const postCodeLabel = {"postCodeTag":0, "postCodeNum":1 , "timeStamp":3}
const postBackTag ={"cart":0, "instantOrder":1 ,"menu":2, "admin":3, "cancel":10} //productsList 1商品リスト内の商品情報一覧表示
const postBackNum = {
  //即時発注番号
  "instantOrder":{
    "check":0, "setOrderNum":1, "orderNumConfirm":2, "setDeliveryday":3,
    "orderConfirm":4, "reOrderConfirm":5
  },

  //買い物かご番号
  "cart":{
    "add":0, "check":1, "allDelete":2, "orderNum":3, "setOrderNum":4, "setDeliveryday":5, "delete":6,
    "orderConfirm":7, "reOrderConfirm":8
  },
  
  //メニュー番号
  "menu":{"checkOrder":0, "changeNumB":1, "changeClass":2},

  //管理者メニュー
  "admin":{
    //商品情報登録
      //商品リスト表示
      "allList":0, 
      
      //商品リスト掲載/非掲載/商品情報編集
      "listUp":1, "listEdit":2, "listEditNow":3,
      
      //個別商品情報登録
      "productNormRegister":10, "picRegister":11,
          
    
    //商品カード確認
      //→自動でやるけど、掲載中、確認中をいつでもみれるように
      "checkList":20, 
      "upStateBuyer":21, "checkStateBuyer":22,"upStateCommon":23, "checkStateCommon":24,

    //商品情報通知
      "sendMessage":30,
      "listMessage":31,"textMessage":32
    
  }    
}

//●発注時 共通キャンセルコード
function getCancelCode(timeStamp){
  return module.exports.postBackTag.cancel + "---" + timeStamp
}

module.exports = {
  postBackDataLabels,
  postCodeLabel,
  postBackTag,
  postBackNum,
  getCancelCode
}
