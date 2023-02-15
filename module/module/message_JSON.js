const action_JSON = require("./LINE_Messaging_API/Action_JSON.js");

//●●●メッセージ●●●
//●テキストメッセージ
function getTextMessage(textMessage) {
  return {
    "type": "text",
    "text": textMessage //最大文字数：5000
  };
}

//●位置情報メッセージ
function getLocationMessage(title, address, latitude, longitude) {
  return {
    "type": "location",
    "title": title,
    "address": address, 
    "latitude": latitude,
    "longitude": longitude
  }
}

//●テンプレートメッセージ
function getTemplateCarouselMessage(altText, columns){
  return {
    "type":"template",
    "altText":altText,
    "template":{
      "type":"carousel",
      "imageAspectRatio": "square",
      "imageSize": "contain",
      "columns":columns,
    }
  }
}

//●動画メッセージ
function getVideoMessage(videoURL, previewImageUrl, trackingId){
  return {
    "type": "video",
    "originalContentUrl": videoURL,
    
      //動画ファイルのURL（最大文字数：2000）
      //プロトコル：HTTPS（TLS 1.2以降）
      //動画フォーマット：mp4
      //最大ファイルサイズ：200MB
    
    "previewImageUrl": previewImageUrl,
    "trackingId": "track-id" + trackingId
  }
}

//●Flexメッセージ
function getflexCarouselMessage(altText, columns){
  return {
    "type":"flex",
    "altText":altText,
    "contents":{
      "type": "carousel",
      "contents":columns 
    }
  }
}

//●Flexメッセージ Menu
function getCarouselMenulMessageCard(columns){
  return {
    "type": "bubble",
    "size": "micro",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "メニュー",
          "size": "lg",
          "weight": "bold",
          "decoration": "underline",
          "align": "center"
        }
      ],
      "paddingAll": "lg"
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": columns,
      "flex": 0
    }
  }
}

//●Flex Message 商品カードボタン
function getProductCardbutton(action){
  return {
    "type": "button",
    "style": "primary",
    "height": "sm",
    "action": action,
    "color": "#905c44"
  }
}

//●Flex Message メニューボタン
function getMenubutton(label, postBackData){
  return {
    "type": "button",
    "height": "sm",
    "action": action_JSON.getPostbackActionWithText(label, postBackData, label),
    "color": "#000000"
  }
}

function getMenubuttonURL(label, url, deskTopUrl){
  return {
    "type": "button",
    "height": "sm",
    "action": action_JSON.getUrlAction(label, url, deskTopUrl),
    "color": "#000000"
  }
}

//●商品画像登録 クイックリプライ
function getPicRegisterMessage() {
  return [{
    "type": "text",
    "text": "画像を送信してください",
    "quickReply": {
      "items": [
        {
          "type": "action",
          "action": {
            "type": "camera",
            "label": "撮影"
          }
        },
        {
          "type": "action",
          "action": {
            "type": "cameraRoll",
            "label": "保存画像選択"
          }
        },
      ],
    },
  }]; 
}
  
module.exports = {
  getTextMessage,
  getLocationMessage,
  getTemplateCarouselMessage,
  getVideoMessage,
  getflexCarouselMessage,
  getCarouselMenulMessageCard,
  getProductCardbutton,
  getMenubutton,
  getMenubuttonURL,
  getPicRegisterMessage
}