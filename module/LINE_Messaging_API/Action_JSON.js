//●ポストバックアクション  リッチメニューを開く
function getPostbackAction(label, postBackData) {
    return {
        "type": "postback",
        "label": label,
        "data": JSON.stringify(postBackData),
        "inputOption": "openRichMenu", 
    }
}

//●ポストバックアクション displayText付 リッチメニューを開く
function getPostbackActionWithText(label, postBackData, displayText) {
    return {
        "type": "postback",
        "label": label,
        "data": JSON.stringify(postBackData),
        "displayText":displayText,
        "inputOption": "openRichMenu",
    }
}

//●日付
function getdateAction(label, postBackData, sD, eD) {
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