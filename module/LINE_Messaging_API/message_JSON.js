const action_JSON = require("./Action_JSON.js");

//●●●メッセージ●●●
//●テキストメッセージ
module.exports.getTextMessage = (textMessage) => {
  return {
    "type": "text",
    "text": textMessage //最大文字数：5000
  };
}

//●位置情報メッセージ
module.exports.getLocationMessage = (title, address, latitude, longitude) => {
  return {
    "type": "location",
    "title": title,
    "address": address, 
    "latitude": latitude,
    "longitude": longitude
  }
}

//●テンプレートメッセージ
module.exports.getTemplateCarouselMessage = (altText, columns) => {
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
module.exports.getVideoMessage = (videoURL, previewImageUrl, trackingId) => {
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
module.exports.getflexCarouselMessage = (altText, columns) => {
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
module.exports.getCarouselMenulMessageCard = (columns) => {
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
module.exports.getProductCardbutton = (action) => {
  return {
    "type": "button",
    "style": "primary",
    "height": "sm",
    "action": action,
    "color": "#905c44"
  }
}

//●Flex Message メニューボタン
module.exports.getMenubutton = (label, POST_BACK_DATA) => {
  return {
    "type": "button",
    "height": "sm",
    "action": action_JSON.getPostbackActionWithText(label, POST_BACK_DATA, label),
    "color": "#000000"
  }
}

module.exports.getMenubuttonURL = (label, url, deskTopUrl) => {
  return {
    "type": "button",
    "height": "sm",
    "action": action_JSON.getUrlAction(label, url, deskTopUrl),
    "color": "#000000"
  }
}

//●商品画像登録 クイックリプライ
module.exports.getPicRegisterMessage = () => {
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