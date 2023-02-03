//11/20 Done

// getCard〇〇


const property = require("./property.js");
const action_JSON = require("./action_JSON.js");
const postCode_JSON = require("./postCode_JSON.js");

//●カード 複数注文  買い物かご
module.exports.getCardForBuyer  = function(bodyContents, footerContents){
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


//●カード 単品  発注確定/追加発注確定 キャンセルボタン
module.exports.getCardOrderCertification = function(explainText, label1, postodata1, label2, postdata2){
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
/*
module.exports.getCardOrderCertification = function(label1, postodata1, label2, postdata2){
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

//●カード 複数注文  発注確定 買い物かごリセット 一括納品日変更ボタン
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

//body 商品情報1  商品画像、残口、newアイコン
module.exports.getCardbodyProductInfo1 = function(picUrl, imageContents){
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

//body 商品情報1  ラベル  買い物かご
module.exports.getCardlabel = function(imageContents, label){
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

//body 商品情報1 画像URL
module.exports.getCardPicURL = function(picUrl){
  if(picUrl == "" || picUrl === undefined || picUrl === null){
    picUrl = "https://drive.google.com/uc?id=1YyBSNal0e0abFwnXaLScToXoJHZeLwks" //No image
  } 
  return picUrl
}

//body 商品情報1 NEWアイコン
module.exports.getCardbodyNewIcon = function(imageContents, judgeNew){
  if(judgeNew){
    imageContents.push(
      {
        "type": "box",
        "layout": "baseline",
        "contents": [
          {
            "type": "icon",
            "url": property.newItemIcon,
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
module.exports.getCardbodyStockNow = function(imageContents, stockNow){
    imageContents.push(
    {
      "type": "box",
      "layout": "baseline",
      "contents": [
        {
          "type": "text",
          "text": stockNow,
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

//body 商品情報2  商品名～市場納品期間
module.exports.getCardbodyProductInfo2 = function(masterProductArray){
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "text",
        "text": masterProductArray[property.constPL.columns.name],
        "size": "md",
        "weight": "bold",
        "wrap": true
      },
      {
        "type": "text",
        "text": masterProductArray[property.constPL.columns.norm],
        "size": "md",
        "wrap": true
      },
      {
        "type": "text",
        "text": masterProductArray[property.constPL.columns.numA] + "-" + masterProductArray[property.constPL.columns.numB] + " " + masterProductArray[property.constPL.columns.producerName],
        "size": "md",
        "adjustMode": "shrink-to-fit"
      },        
      {
        "type": "text",
        "text": masterProductArray[property.constPL.columns.deliveryPeriod],
        "size": "md"
      },
    ],
    "spacing": "sm",
    "paddingStart": "xl",
    "paddingEnd": "xl"        
  }
}

//body 商品情報2  商品名～市場納品期間
//買い物かご  
module.exports.getCardbodyProductInfo2ForCart = function(postBackDataArray, deliveryPeriod){
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "text",
        "text": postBackDataArray[postCode_JSON.postBackDataLabels.name],
        "size": "md",
        "weight": "bold",
        "wrap": true
      },
      {
        "type": "text",
        "text": postBackDataArray[postCode_JSON.postBackDataLabels.norm],
        "size": "md",
        "wrap": true
      },
      {
        "type": "text",
        "text": postBackDataArray[postCode_JSON.postBackDataLabels.producer],
        "size": "md",
        "adjustMode": "shrink-to-fit"
      },        
      {
        "type": "text",
        "text": deliveryPeriod,
        "size": "md"
      },
    ],
    "spacing": "sm",
    "paddingStart": "xl",
    "paddingEnd": "xl"        
  }
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
module.exports.getCardfooterDeliverydayBottun = function(label, postBackData, sD, eD){
  return {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "button",
        "style": "primary",
        "height": "sm",
        "action": {
          "type": "datetimepicker",
          "label": label,
          "data": postBackData,
          "mode": "date",
          "initial" : sD,
          "min" : sD,
          "max" : eD,
        },
        "color": "#905c44",
      }
    ],
    "cornerRadius": "xxl"
  }
}