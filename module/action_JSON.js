//●ポストバックアクション  リッチメニューを開く
function getPostbackAction(label, data) {
    return {
        "type": "postback",
        "label": label,
        "data": data,
        "inputOption": "openRichMenu", 
    }
}

//●ポストバックアクション displayText付 リッチメニューを開く
function getPostbackActionWithText(label, data, displayText) {
    return {
        "type": "postback",
        "label": label,
        "data": data,
        "displayText":displayText,
        "inputOption": "openRichMenu",
    }
}

//●日付
function getdateAction(label, postBackData, sD, eD) {
    return {
        "type": "datetimepicker",
        "label": label,
        "data": postBackData,
        "mode": "date",
        "initial" : sD,
        "min" : sD,
        "max" : eD,
    }
}

//●URL
//encodeURI の記述変更する
function getUrlAction(label, url, deskTopUrl) {
    return {
        "type":"uri",
        "label": label,
        "uri": encodeURI(url),
        "altUri": {
        "desktop" : encodeURI(deskTopUrl)
        }
    }
}

module.exports = {
    getPostbackAction,
    getPostbackActionWithText,
    getdateAction,
    getUrlAction
}