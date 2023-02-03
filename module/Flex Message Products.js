/* eslint-disable one-var */
//12/18 Done

const postCode_JSON = require("./postCode_JSON.js")
const property = require("./property.js");
const action_JSON = require("./action_JSON.js");
const flexMessage_ForBuyer = require("./Flex Message For Buyer.js");

//●商品リスト一覧 Flex Messge 買参人、一般用
function getAllListCard(title, detail, postBackData) {
  return {
    "type": "bubble",
    "size": "kilo",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": title,
          "size": "lg",
          "wrap": true,
          "decoration": "underline",
          "weight": "bold",
          "adjustMode": "shrink-to-fit"
        },
        {
          "type": "text",
          "text": detail,
          "size": "md",
          "wrap": true
        }
      ],
      "spacing": "md"
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "height": "sm",
          "action": action_JSON.getPostbackActionWithText("詳細", postBackData, "詳細")
        }
      ],
    },
    "styles": {
      "footer": {
        "separator": true
      }
    }
  }
}

//●商品カード Flex Messge 買参人用
function getProductsCarouselForBuyer(masterProductArray, postBackData, timeStamp){
  //PostData
    const postBackDataBuy         = postCode_JSON.postBackTag.instantOrder + "-" + postCode_JSON.postBackNum.instantOrder.check + "--" + timeStamp + "∫" + postBackData
    const postBackDataAddCart     = postCode_JSON.postBackTag.cart         + "-" + postCode_JSON.postBackNum.cart.add      + "--" + timeStamp + "∫" + postBackData
  
  //body
    let bodyContents  = [], imageContents = [], footerContents = []
    imageContents = flexMessage_ForBuyer.getCardbodyNewIcon(imageContents, masterProductArray[property.constPL.columns.judgeNew])   //newicon
  
  //現在庫数字でない 発注ボタンを非表示 現在庫 テキスト表示
    if(isNaN(masterProductArray[property.constPL.columns.stockNow])){
      imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, masterProductArray[property.constPL.columns.stockNow])  //残口
      bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(masterProductArray[property.constPL.columns.picUrl]), imageContents))//商品情報１  画像、NEWアイコン、残口追加
    }

  //現在庫数字 残口あり 発注ボタンを表示
    else if(Number(masterProductArray[property.constPL.columns.stockNow]) > 0) {
      imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "残" + masterProductArray[property.constPL.columns.stockNow] + "口")  //残口
      bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(masterProductArray[property.constPL.columns.picUrl]), imageContents))//商品情報１  画像、NEWアイコン、残口追加

      footerContents.push(flexMessage_ForBuyer.getCardfooterBottun("発注", masterProductArray[property.constPL.columns.name] + masterProductArray[property.constPL.columns.norm] + "を発注", postBackDataBuy))
      footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWithText("カートへ", postBackDataAddCart, masterProductArray[property.constPL.columns.name] + masterProductArray[property.constPL.columns.norm] + "をカートへ入れました。"))
    }

  //現在庫数字 残口なし 発注ボタンを非表示
    else{
      imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "完売")  //残口
      //bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL("https://drive.google.com/uc?id=1O0Y4sc-vMYE7-5LPF0tbywHG7Owt0TKO"), imageContents))//商品情報１  完売画像、NEWアイコン
      bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(masterProductArray[property.constPL.columns.picUrl]), imageContents))//商品情報１  画像、NEWアイコン、残口追加
    }
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(masterProductArray))//商品情報2   商品名～市場納品期間

  return  flexMessage_ForBuyer.getCardForBuyer(bodyContents, footerContents)
}

module.exports = {
  getAllListCard,
  getProductsCarouselForBuyer
}