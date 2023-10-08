const message_JSON = require("./message_JSON.js");
const StampMessage = require("./Class Stamp.js");

const FireStore_API = require("../npm API/FireStore_API.js");

//●イレギュラーメッセージ
module.exports.whenOldProductInfo = async (TIMESTAMP_NEW) => {
    console.log(`----商品未掲載、または情報が古い----` )
    let messagesArray = [];
    
    messagesArray = await FireStore_API.getUpStateAllList(TIMESTAMP_NEW, true)  //買参人用、掲載中, タイムスタンプ
    
    const textMessage = "当商品は受注を締め切りました。\n他の商品をご検討くださいませ。";
    messagesArray.unshift(message_JSON.getTextMessage(textMessage));
    
    return messagesArray
}

module.exports.whenStockNone = () => {
    console.log(`----在庫 なし----` )
    let messagesArray = [];
    
    const textMessage = "当商品は受注を締め切りました。\n他の商品をご検討くださいませ。";
    messagesArray.push(message_JSON.getTextMessage(textMessage));
    messagesArray.push(new StampMessage().お手数おかけします);

    return messagesArray
}

module.exports.whenZeroProductInCart = async (TIMESTAMP_NEW) => {
  console.log(`----買い物かご内 商品0----` )
  let messagesArray = [];

  messagesArray = await FireStore_API.getUpStateAllList(TIMESTAMP_NEW, true)  //買参人用、掲載中, タイムスタンプ
  
  const textMessage = "現在、買い物かごに商品はありません。";
  messagesArray.unshift(message_JSON.getTextMessage(textMessage));
  
  return messagesArray
}