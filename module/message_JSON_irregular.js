const message_JSON = require("./message_JSON.js");
const StampMessage = require("./class Stamp.js");

//●イレギュラーメッセージ
function whenOldProductInfo(){
    console.log(`----商品未掲載、または情報が古い----` )
    let messagesArray = [];
    let textMessage = "当商品は受注を締め切りました。\n他の商品をご検討くださいませ。";
    
    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().お手数おかけします);
    
    return messagesArray
}

function whenStockNone(){
    console.log(`----在庫 なし----` )
    let messagesArray = [];
    let textMessage = "当商品は在庫がなくなり受注を締め切りました。\n他の商品をご検討くださいませ。";

    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().お手数おかけします);

    return messagesArray
}

function whenZeroProductInCart(){
    console.log(`----買い物かご内 商品0----` )
    let messagesArray = [];
    let textMessage = "現在、買い物かごに商品はありません。";

    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().何卒)
    
    return messagesArray
}
  
function whenNoneProductInCart(){
    console.log(`----買い物かご内 該当商品なし----` )
    let messagesArray = [];
    let textMessage = "現在、買い物かごに該当の商品はありません。\nメインメニューより最新の買い物かご情報を表示し、操作して下さい。";

    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().何卒)

    return messagesArray
}
module.exports = {
    whenOldProductInfo,
    whenStockNone,
    whenZeroProductInCart,
    whenNoneProductInCart,
}