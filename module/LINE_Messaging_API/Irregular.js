const message_JSON = require("./message_JSON.js");
const StampMessage = require("./Class Stamp.js");

//●イレギュラーメッセージ
const whenOldProductInfo = () => {
    console.log(`----商品未掲載、または情報が古い----` )
    let messagesArray = [];
    const textMessage = "当商品は受注を締め切りました。\n他の商品をご検討くださいませ。";
    
    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().お手数おかけします);
    
    return messagesArray
}

const whenStockNone = () => {
    console.log(`----在庫 なし----` )
    let messagesArray = [];
    const textMessage = "当商品は在庫がなくなり受注を締め切りました。\n他の商品をご検討くださいませ。";

    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().お手数おかけします);

    return messagesArray
}

const whenZeroProductInCart = () => {
    console.log(`----買い物かご内 商品0----` )
    let messagesArray = [];
    const textMessage = "現在、買い物かごに商品はありません。";

    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().何卒)
    
    return messagesArray
}
  
const whenNoneProductInCart = () => {
    console.log(`----買い物かご内 該当商品なし----` )
    let messagesArray = [];
    const textMessage = "現在、買い物かごに該当の商品はありません。\nメインメニューより最新の買い物かご情報を表示し、操作して下さい。";

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