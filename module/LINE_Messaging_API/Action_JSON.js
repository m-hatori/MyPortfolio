//●ポストバックアクション  リッチメニューを開く
module.exports.getPostbackAction = (label, postBackData) => {
 return {
  "type": "postback",
  "label": label,
  "data": JSON.stringify(postBackData),
  "inputOption": "openRichMenu", 
 }
}

//●ポストバックアクション displayText付 リッチメニューを開く
module.exports.getPostbackActionWithText = (label, postBackData, displayText) => {
  return {
 "type": "postback",
 "label": label,
 "data": JSON.stringify(postBackData),
 "displayText":displayText,
 "inputOption": "openRichMenu",
  }
}

//●日付
module.exports.getdateAction = (label, postBackData, sD, eD) => {
 return {
  "type": "datetimepicker",
  "label": label,
  "data": JSON.stringify(postBackData),
  "mode": "date",
  "initial" : sD,
  "min" : sD,
  "max" : eD,
 }
}

//●URL
//encodeURI の記述変更する
module.exports.getUrlAction = (label, url, deskTopUrl) => {
 return {
  "type":"uri",
  "label": label,
  "uri": encodeURI(url),
  "altUri": {
   "desktop" : encodeURI(deskTopUrl)
  }
 }
}