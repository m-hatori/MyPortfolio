/* eslint-disable one-var */
const property = require("../property.js");
const action_JSON = require("./Action_JSON.js");
const timeMethod = require("../getTime.js");

//●商品カード ボタンあり
module.exports.getProductCardForBuyer  = (bodyContents, footerContents) => {
  return {
    "type": "bubble",
    "size": "kilo",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": bodyContents,
      "spacing": "sm",
      "paddingAll": "none"
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "contents": footerContents,
      "spacing": "sm",
      "paddingAll": "md",
      "justifyContent": "space-evenly",
    },
    "styles": {
      "body": {
        "backgroundColor": "#fddea5"
      },
      "footer": {
        "separator": true
      }
    }
  }
}
//●TODO: 複数注文  買い物かご  一括納品日変更ボタン付バージョン
/*
  module.exports.getCardOrderCertificationForCart = function(label1, postodata1, label2, postdata2, label3, postdata3, sD, eD){
    return {
      "type": "bubble",
      "size": "kilo",    
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "button",
                "action": getPostbackActionWithText(" ", postodata1, label1),
                "height": "md",
                "position": "relative",
                "style": "primary",
                "color": "#905c44"
              },
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "text": label1,
                    "align": "center",
                    "size": "xxl",
                    "action": getPostbackActionWithText(label1, postodata1, label1),
                    "color": "#ffffff"
                  }
                ],
                "position": "absolute",
                "justifyContent": "center",
                "alignItems": "center",
                "width": "100%",
                "height": "100%"
              }
            ],
            "cornerRadius": "xxl",
            "width": "80%",
            "justifyContent": "center",
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [],
            "height": "15%",
            "width": "80%"
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "button",
                "action": getPostbackActionWithText(" ", postdata2, label2),
                "height": "md",
                "style": "primary",
                "color": "#905c44"
              },
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "text": label2,
                    "align": "center",
                    "size": "xxl",
                    "action": getPostbackActionWithText(label2, postdata2, label2),
                    "color": "#ffffff",
                    "adjustMode": "shrink-to-fit",
                    "wrap": true

                  }
                ],
                "position": "absolute",
                "justifyContent": "center",
                "alignItems": "center",
                "width": "100%",
                "height": "100%"
              }
            ],
            "cornerRadius": "xxl",
            "width": "80%",
            "justifyContent": "center",
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "button",
                "action": getPostbackActionWithText(" ", postdata3, label3),
                "height": "md",
                "style": "primary",
                "color": "#905c44"
              },
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "text": label3,
                    "align": "center",
                    "size": "xxl",
                    "action": getdateAction(label3, postdata3, sD, eD) ,
                    "color": "#ffffff",
                    "adjustMode": "shrink-to-fit",
                    "wrap": true

                  }
                ],
                "position": "absolute",
                "justifyContent": "center",
                "alignItems": "center",
                "width": "100%",
                "height": "100%"
              }
            ],
            "cornerRadius": "xxl",
            "width": "80%",
            "justifyContent": "center",
          }        
        ],
        "spacing": "md",
        "paddingAll": "xxl",
        "justifyContent": "center",
        "alignItems": "center"
      }
    }  
  }
*/

//●商品カード 単品注文  発注確定/追加発注確定 キャンセルボタン
//●商品カード 複数注文  発注確定/追加発注確定 買い物かごリセットボタン
module.exports.getCardOrderCertification = (explainText, label1, postodata1, label2, postdata2) => {
  const footerContents =  [
    {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "action": action_JSON.getPostbackActionWithText(" ", postodata1, label1),
          "height": "md",
          "position": "relative",
          "style": "primary",
          "color": "#905c44"
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": label1,
              "align": "center",
              "size": "md",
              "action": action_JSON.getPostbackActionWithText(label1, postodata1, label1),
              "color": "#ffffff"
            }
          ],
          "position": "absolute",
          "justifyContent": "center",
          "alignItems": "center",
          "width": "100%",
          "height": "100%"
        }
      ],
      "cornerRadius": "xxl",
      "justifyContent": "center",
    },        
    {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "action": action_JSON.getPostbackActionWithText(" ", postdata2, label2),
          "height": "md",
          "style": "primary",
          "color": "#905c44"
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": label2,
              "align": "center",
              "size": "md",
              "action": action_JSON.getPostbackActionWithText(label2, postdata2, label2),
              "color": "#ffffff",
              "adjustMode": "shrink-to-fit",
              "wrap": true

            }
          ],
          "position": "absolute",
          "justifyContent": "center",
          "alignItems": "center",
          "width": "100%",
          "height": "100%"
        }
      ],
      "cornerRadius": "xxl",
      "justifyContent": "center",
    }
  ];
  //console.log(`発注確認カード フッター${JSON.stringify(footerContents)}`)
  return {
    "type": "bubble",
    "size": "kilo",    
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
        "type": "text",
        "text": explainText,
        "wrap": true,
        "size": "md"
        }
      ],
      "spacing": "md",
      "paddingAll": "xxl",
      "justifyContent": "center",
      "alignItems": "center"
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "contents": footerContents,
      "spacing": "sm",
      "paddingAll": "md",
      "justifyContent": "space-evenly",
    },
    "styles": {
      "body": {
        "backgroundColor": "#fddea5"
      },
      "footer": {
        "separator": true
      }
    }    
  }
}

//●商品カード 単品/複数注文  キャンセルボタン
//●商品カード 単品/複数注文  買い物かごリセットボタン
module.exports.getCardOnlyNegativeBottun = (explainText, label1, postodata1) => {
  let footerContents =  [
    {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "action": action_JSON.getPostbackActionWithText(" ", postodata1, label1),
          "height": "md",
          "position": "relative",
          "style": "primary",
          "color": "#905c44"
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": label1,
              "align": "center",
              "size": "md",
              "action": action_JSON.getPostbackActionWithText(label1, postodata1, label1),
              "color": "#ffffff"
            }
          ],
          "position": "absolute",
          "justifyContent": "center",
          "alignItems": "center",
          "width": "100%",
          "height": "100%"
        }
      ],
      "cornerRadius": "xxl",
      "justifyContent": "center",
    }
  ];
         
  return {
    "type": "bubble",
    "size": "kilo",    
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
        "type": "text",
        "text": explainText,
        "wrap": true,
        "size": "md"
        }
      ],
      "spacing": "md",
      "paddingAll": "xxl",
      "justifyContent": "center",
      "alignItems": "center"
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "contents": footerContents,
      "spacing": "sm",
      "paddingAll": "md",
      "justifyContent": "space-evenly",
    },
    "styles": {
      "body": {
        "backgroundColor": "#fddea5"
      },
      "footer": {
        "separator": true
      }
    }    
  }
}

//●商品カード 部品
//body 続きはこちら
module.exports.getProductInfoContinuationCard = (postBackData) =>{
  return {
    "type": "bubble",
    "size": "kilo",
    "body": {
      "type": "box",
      "layout": "vertical",
      "justifyContent": "center",
      "action": action_JSON.getPostbackAction("続き", postBackData),
      "contents": [
        {
          "type": "text",
          "text": "続きはこちら",
          "size": "xl",          
          "decoration": "underline",
          "align": "center"
        }
      ]
    } 
  }
}

//body 単品/複数注文 商品カード上部  ラベル
module.exports.getCardlabel = (imageContents, label) => {
  imageContents.push(
    {
      "type": "box",
      "layout": "baseline",
      "contents": [
        {
          "type": "text",
          "text": label,
          "size": "md",
          "align": "center"
        }
      ],
      "width": "100%",
      "height": "10%",
      "position": "absolute",
      "backgroundColor": "#fa8072"                    
    }
  )
  return imageContents
}

//body 商品情報1  商品画像、残口、newアイコン
module.exports.getCardbodyProductInfo1 = (picUrl, imageContents) => {
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "image",
            "url": picUrl,
            "size": "400px",
            "aspectMode": "fit",
            "aspectRatio": "4:3"
          }
        ],
        "paddingAll": "none"
      },
      {
        "type": "box",
        "layout": "horizontal",
        "contents": imageContents,
        "position": "absolute",
        "width": "100%",
        "justifyContent": "space-between",
        "height": "100%",
        /*
        "action": {
          "type": "uri",
          "label": "action",
          "uri": picUrl
        }
        */
      }
    ]
  }  
}

//body 商品情報1 画像URL
module.exports.getCardPicURL = (picUrl) => {
  if(picUrl == "" || picUrl === undefined || picUrl === null){
    picUrl = "https://drive.google.com/uc?id=1YyBSNal0e0abFwnXaLScToXoJHZeLwks" //No image
  } 
  return picUrl
}

//body 商品情報1 NEWアイコン
module.exports.getCardbodyNewIcon = (imageContents, judgeNew) => {
  if(judgeNew){
    imageContents.push(
      {
        "type": "box",
        "layout": "baseline",
        "contents": [
          {
            "type": "icon",
            "url": process.env.NEW_ICON,
            "size": "4xl"
          }
        ],
        "width": "25%",
        "height": "30%"
      }
    )
  }
  return imageContents
}

//body 商品情報1 残口
module.exports.getCardbodyStockNow = function(imageContents, displaytext){
  imageContents.push(
    {
      "type": "box",
      "layout": "baseline",
      "contents": [
        {
          "type": "text",
          "text": displaytext,
          "size": "sm",
          "align": "center"
        }
      ],
      "backgroundColor": "#90ee90",
      "cornerRadius": "xxl",
      "width": "25%",
      "height": "10%",
      "position": "absolute",
      "offsetTop": "90%",
      "offsetStart": "70%"
    }
  )
  return imageContents
}

//body 複数注文 商品情報2  商品名 規格 出荷者 市場納品期間
module.exports.getCardbodyProductInfo2 = (productInfoArray) => {
  const json = {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "text",
        "text": productInfoArray[property.constPL.columns.name],
        "size": "md",
        "weight": "bold",
        "wrap": true
      },
      {
        "type": "text",
        "text": productInfoArray[property.constPL.columns.norm],
        "size": "md",
        "wrap": true
      },
      {
        "type": "text",
        "text": productInfoArray[property.constPL.columns.numA] + "-" + productInfoArray[property.constPL.columns.numB] + " " +  productInfoArray[property.constPL.columns.producerName],
        "size": "md",
        "adjustMode": "shrink-to-fit"
      },        
      {
        "type": "text",
        "text": productInfoArray[property.constPL.columns.deliveryPeriod],
        "size": "md"
      },
    ],
    "spacing": "sm",
    "paddingStart": "xl",
    "paddingEnd": "xl"        
  }
  //console.log(json)
  return json
}

//body 発注情報
module.exports.getCardbodyOrdderInfo = function(textOrderNum, textDeliveryday){
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "separator",
        "margin": "xs",
        "color": "#000000"
      },
      {
        "type": "text",
        "text": textOrderNum,
        "size": "md",
        "wrap": true
      },
      {
        "type": "text",
        "text": textDeliveryday,
        "size": "md",
        "wrap": true
      },                  
    ],
    "spacing": "sm",
    "paddingStart": "xl",
    "paddingEnd": "xl"        
  }
}

//fotter ボタン
module.exports.getCardfooterBottun = function(label, textMessage, postBackData) {
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "style": "primary",
        "action": action_JSON.getPostbackActionWithText(label, postBackData, textMessage),
        "height": "sm",
        "color": "#905c44",
      }
    ],
    "cornerRadius": "xxl",
  }
}

//fotter ボタン テキスト送信あり
module.exports.getCardfooterBottunWithText = function(label, postBackData, textMessage) {
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "style": "primary",
        "action": action_JSON.getPostbackActionWithText(label, postBackData, textMessage),
        "height": "sm",
        "color": "#905c44",
      }
    ],
    "cornerRadius": "xxl",
  }
}

//fotter ボタン テキスト送信なし
module.exports.getCardfooterBottunWithoutText = function(label, postBackData) {
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "style": "primary",
        "action": action_JSON.getPostbackAction(label, postBackData),
        "height": "sm",
        "color": "#905c44",
      }
    ],
    "cornerRadius": "xxl",
  }
}

//fotter ボタン 横幅指定
module.exports.getCardfooterBottunWidth = function(label, textMessage, postBackData, width) {
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "style": "primary",
        "action": action_JSON.getPostbackActionWithText(label, postBackData, textMessage),
        "height": "sm",
        "color": "#905c44",
      }
    ],
    "cornerRadius": "xxl",
    "width": width
  }
}

//fotter 納品日ボタン
module.exports.getCardfooterDeliverydayBottun = function(label, postBackData, productInfoArray){
  const SD_FMT_LINE = timeMethod.getDateFmt(productInfoArray[property.constPL.columns.sDeliveryday]._seconds*1000, "LINE_SYS")
  const ED_FMT_LINE = timeMethod.getDateFmt(productInfoArray[property.constPL.columns.eDeliveryday]._seconds*1000, "LINE_SYS")
  //console.log(`納品日ボタン 納品開始日: ${SD_FMT_LINE} 納品終了日: ${ED_FMT_LINE}`)
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "style": "primary",
        "height": "sm",
        "action": action_JSON.getdateAction(label, postBackData, SD_FMT_LINE, ED_FMT_LINE),
        "color": "#905c44",
      }
    ],
    "cornerRadius": "xxl"
  }
}


//●発注履歴
module.exports.getOrderRecordCard = (orderDate, prductName ,norm , producerInfo, stateOrderNum, stateDeliveryday) => {
  return {
    "type": "bubble",
    "size": "kilo",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "box",
          "layout": "baseline",
          "contents": [
            {
              "type": "text",
              "text": orderDate,
              "size": "md",
              "align": "center"
            }
          ],
          "backgroundColor": "#fa8072",
          "paddingTop": "sm",
          "paddingBottom": "sm"              
        },            
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": prductName,
              "size": "md",
              "weight": "bold",
              "wrap": true
            },
            {
              "type": "text",
              "text": norm,
              "size": "md",
              "wrap": true
            },
            {
              "type": "text",
              "text": producerInfo,
              "size": "md",
              "adjustMode": "shrink-to-fit"
            },
            {
              "type": "separator",
              "margin": "xs",
              "color": "#000000"
            },
            {
              "type": "text",
              "text": stateOrderNum,
              "size": "md",
              "wrap": true
            },
            {
              "type": "text",
              "text": stateDeliveryday,
              "size": "md",
              "adjustMode": "shrink-to-fit"
            },
            {
              "type": "text",
              "text": " ",
              "size": "md",
              "wrap": true
            },              
          ],
          "spacing": "sm",
          "paddingStart": "xl",
          "paddingEnd": "xl"        
        },
      ],
      "spacing": "sm",
      "paddingAll": "none"
    },
    "styles": {
      "body": {
        "backgroundColor": "#fddea5"
      },
    }
  }
}
