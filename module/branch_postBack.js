/* eslint-disable one-var */
const timeMethod = require("./getTime.js");

const Products = require("./class ProductsList.js");
const OrderRecords = require("./class OrdersList.js");

const { getUpStateAllList } = require("./npm API/FireStore_API.js");
//const SpreadSheet_API = require("./npm API/SpreadSheet_API.js");

const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");
const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const Irregular = require("./LINE_Messaging_API/Irregular.js");
const Order = require("./LINE_Messaging_API/Order.js");
const OneOrder = require("./LINE_Messaging_API/OneOrder.js");
const Cart = require("./LINE_Messaging_API/Cart.js")


//タイムスタンプ確認
const checkTimeStamp = async (TIMESTAMP, TIMESTAMP_NEW, TAG, user) =>{
  if(TIMESTAMP === undefined ||  TIMESTAMP == ""){
    console.error(`Error:timeStampに問題があります。`)
    throw Error()
  }
  
  //タイムリミット
  const dt = TIMESTAMP_NEW - TIMESTAMP
  const timelimit = 900000 //ms 15分
  
  //console.log(`差 : ${dt}m秒  タイムリミット：${TIMELIMIT_STATE}`)

  //受注締切日時
  const DEADLINE = new Date()
  DEADLINE.setHours(4); //時刻を UTC 13:00:00 に設定 13-9 = 4
  DEADLINE.setMinutes(0);
  DEADLINE.setSeconds(0);
  const UNIXTIME_DEADLINE = DEADLINE.getTime()
  //console.log(`受注締切日時: ${DEADLINE}`)

  let timeStampState, textMessage, timeError = true
  if(dt > timelimit){
    timeStampState = "タイムアウト"
    textMessage = "15分以上が経過しているためセッションがタイムアウトしました。"
  }
  else if(TIMESTAMP <= UNIXTIME_DEADLINE && UNIXTIME_DEADLINE <= TIMESTAMP_NEW){
    timeStampState = "受注締切時 超過";
    textMessage = "受注締切日時を過ぎました。"
  }
  else{
    timeStampState = "問題なし";
    textMessage = ""
    timeError = false
  }

  let messagesArray = []
  if(timeStampState != "問題なし" && textMessage != ""){
    if(TAG == "cart" && user.property.CART.length > 0){
      timeStampState += "買い物かご商品表示"      
      //STATE_NEWORDER 新規発注確認: true
      //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
      //商品有無確認
      messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)
      textMessage += "\n\n上の再表示した買い物かご情報より、再度手続きをお願いいたします。"
      messagesArray.push(message_JSON.getTextMessage(textMessage))
      user.setRichMenu()
    }
    else{
      //商品リストの一覧表示
      timeStampState += "商品リスト一覧表示"      
      messagesArray = await getUpStateAllList(TIMESTAMP_NEW, true)
      textMessage += "\n\n上の再表示した商品リストより、再度手続きをお願いいたします。"
      messagesArray.push(message_JSON.getTextMessage(textMessage))
    }
  }
  console.log(`タイムスタンプ確認: ${timeStampState}`)
  return [timeError, messagesArray]
}

//ポストバック処理分岐
module.exports.process = async (event, TIMESTAMP_NEW, postBackData, user) => {
  //●共通前処理  
  let CONSOLE_STATE = "branch_postBack_process"
  let messagesArray = []
  
  //postBackCode
  const TAG = postBackData.tag
  const COMMAND = postBackData.command
  const TIMESTAMP = Number(postBackData.timeStamp)
  
  //メニュー処理
  if(TAG == "menu"){
    //発注履歴
    if(COMMAND == "checkOrderRecord"){
      const orderRecords = new OrderRecords(user);
      await orderRecords.getUserOrderData()
      messagesArray = orderRecords.getAllOrderRecords()
    }
    //TBD 枝番号の変更
    //else if(COMMAND == "changeBranchNum"){
    //}
    //TBD ユーザークラス切替
    //else if(COMMAND == "changeClass"){
    //}
    //TBD 近隣の出荷者情報の閲覧
    //マニュアル Not postBack
    //利用規約 Not postBack
  }
  //あらゆるキャンセル
  else if(TAG == "cancel"){
    messagesArray.push(message_JSON.getTextMessage("キャンセルですね。\nまたのご利用をお待ちしております。"))
    messagesArray.push(new StampMessage().何卒)
  
    //リッチメニュー切り替え 保険
    user.setRichMenu()
  }
  else{
    /*
    //商品リスト一覧 1行ずつ表示
    if(TAG == "productsList"){
      if(COMMAND == "1"){
        messagesArray = await getUpStateAllList(TIMESTAMP_NEW, true)
      }
      else{
        messagesArray = await getUpStateAllList(TIMESTAMP_NEW, false)
      }
      return
    }
    */

    //制限時間内の情報からのアクションか確認
    const timeState = await checkTimeStamp(TIMESTAMP, TIMESTAMP_NEW, TAG, user)
    if(timeState[0]){return timeState[1]}
    

    //商品リスト一覧表示
    if(TAG == "allList"){
      let lineNum = true
      if(COMMAND == "continuation"){ lineNum = false }
      messagesArray = await getUpStateAllList(TIMESTAMP_NEW, lineNum)      
    }

    //1商品リストの商品一覧表示
    else if(TAG == "productsList"){
      let lineNum = true
      if(COMMAND == "continuation"){ lineNum = false }
      messagesArray = await new Products(postBackData.product.sheetId).getAllproductInfo(postBackData.product.ORERBUTTON_STATE, postBackData.product.OPTION_UPSTATE, TIMESTAMP_NEW, lineNum)
    }
    
    //複数発注処理（買い物かご）
    else if(TAG == "cart"){
      CONSOLE_STATE += ": 複数発注処理"
      
      //0 買い物かご 商品追加
      if(COMMAND == "add"){
        console.log(`${CONSOLE_STATE}: 商品追加`)
        //console.log(`買い物かご追加前: ${JSON.stringify(user.property.CART)}`)

        if(user.property.CART.length < 10){
          //商品情報追加 配列末尾に
          user.property.CART.push(postBackData.product)
          
          //買い物かご更新
          await user.updateDB()
          //console.log(`買い物かご追加後: ${JSON.stringify(user.property.CART)}`)
          //messagesArray.push(message_JSON.getTextMessage("追加しました。"))
          return messagesArray
        }
        else{
          messagesArray.push(message_JSON.getTextMessage("買い物かごに入れられる商品数は、最大10点です。\n新しく追加するには、買い物かごから商品を削除するか、商品の発注を完了してください。"))
          return messagesArray
        }
      }

      //買い物かご商品有無確認
      if(user.property.CART.length <= 0){
        user.setRichMenu()
        return Irregular.whenZeroProductInCart()
      }

      //0 買い物かご情報確認
      if(COMMAND == "check"){
        console.log(`${CONSOLE_STATE}: 買い物かご情報確認`)
        
        //カルーセルメッセージ取得
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
        messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)

        //const textMessage = "最初は、希望口数は1、希望市場納品日は最短納品可能日が指定されています。\n\n「口数」、「納品日」ボタンを押すと、それぞれ変更できます。"
        //+ "「削除」ボタンを押すと、買い物かごから削除できます。\n\n"
        //messagesArray.push(message_JSON.getTextMessage(textMessage))
        user.setRichMenu()
        return messagesArray
      }
      //買い物かご 全商品削除
      else if(COMMAND == "allDelete"){
        console.log(`${CONSOLE_STATE}: 全商品削除`)

        //買い物かごクリア
        user.property.CART = []

        //買い物かご更新
        await user.updateDB()
        
        //テキストメッセージ返信
        messagesArray.push(message_JSON.getTextMessage("買い物かごを空にしました。"))
        return messagesArray
      }
      //新規発注確定
      else if(COMMAND == "orderConfirm"){
        console.log(`${CONSOLE_STATE}: 新規発注確定`)
        const reOrderConfirm_STATE = false
        
        let orderArrays, plSheets
        [messagesArray, orderArrays, plSheets] = await Cart.orderConfirm(user, TIMESTAMP, reOrderConfirm_STATE)
        if(messagesArray.length > 0){user.httpsRequest.replyMessageByAxios(event, messagesArray)}
        
        Order.setOrderInfo(orderArrays, plSheets)
        return []                
      }
      //再発注確定
      else if(COMMAND == "reOrderConfirm"){
        console.log(`${CONSOLE_STATE}: 再発注確定`)
        const reOrderConfirm_STATE = true

        let orderArrays, plSheets
        [messagesArray, orderArrays, plSheets] = await Cart.orderConfirm(user, TIMESTAMP, reOrderConfirm_STATE)
        if(messagesArray.length > 0){user.httpsRequest.replyMessageByAxios(event, messagesArray)}
        
        Order.setOrderInfo(orderArrays, plSheets)
        return []
      }

    
      //買い物かご内 商品情報 有無確認
      const CARTINFOARRAY_INDEX = await (async () => {
        let index, BUFF_TEXT, state = "-買い物かご内 商品情報 なし"
        for(index in user.property.CART){
          BUFF_TEXT = user.property.CART[index]
          if(
            BUFF_TEXT.orderState == postBackData.product.orderState &&
            BUFF_TEXT.sheetId == postBackData.product.sheetId &&
            BUFF_TEXT.productId == postBackData.product.productId &&
            BUFF_TEXT.producer == postBackData.product.producer &&
            BUFF_TEXT.name == postBackData.product.name &&
            BUFF_TEXT.norm == postBackData.product.norm &&
            BUFF_TEXT.orderNum == postBackData.product.orderNum &&
            BUFF_TEXT.deliveryday == postBackData.product.deliveryday
          ){
            state = `-買い物かご内 商品情報 あり index: ${index}`
            break
          }
        }
        console.log(state)
        return index
      })()

      if(CARTINFOARRAY_INDEX < 0){return Irregular.whenNoneProductInCart()}
       
      //2 希望口数伺い クイックリプライメッセージ
      else if(COMMAND == "selectOrderNum"){
        console.log(`${CONSOLE_STATE}: 希望口数伺い`)
        messagesArray = await Order.selectOrderNum(postBackData)
      }
      //3 希望口数指定 買い物かごに反映
      else if(COMMAND == "setOrderNum"){
        console.log(`${CONSOLE_STATE}: 希望口数指定`)
        
        //口数指定
        //console.log(`口数変更前 買い物かご情報： ${user.property.CART[CARTINFOARRAY_INDEX]}`)
        postBackData.product.orderNum = postBackData.newOrderNum
        postBackData.product.orderState = 0 //発注状況 リセット
        user.property.CART[CARTINFOARRAY_INDEX] = postBackData.product
        //console.log(`口数変更後 買い物かご情報： ${user.property.CART[CARTINFOARRAY_INDEX]}`)

        //買い物かご カルーセルメッセージ送信
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0
        messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 0)
        messagesArray.unshift(message_JSON.getTextMessage("No." + (Number(CARTINFOARRAY_INDEX) + 1) + "の口数を変更しました。"))
        
        //買い物かご更新
        await user.updateDB()
      }
      //4 納品日指定 買い物かご情報に希望市場納品日を追記。メニューに切り替え。
      else if(COMMAND == "setDeliveryday"){
        console.log(`${CONSOLE_STATE}: 納品日指定`)
        postBackData.product.deliveryday = Order.getUnixTimeFMDeliveryday(event.postback.params.date)
        postBackData.product.orderState = 0 //発注状況 リセット

        //荷受け日、ブロック日確認
        const [newDeliveryday, changeStateDeliveryday] = timeMethod.checkDeliveryday(postBackData.product.deliveryday)
        postBackData.product.deliveryday = newDeliveryday

        //納品日更新 DB書き換え
        user.property.CART[CARTINFOARRAY_INDEX] = postBackData.product

        //買い物かご カルーセルメッセージ送信
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 納品日がテキストでなく、納品日チェックが不要        
        messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 0)

        //買い物かご更新
        let textMessage_changeDeliveryday = "No." + (Number(CARTINFOARRAY_INDEX) + 1)
        if(changeStateDeliveryday){
          await user.updateDB()
          textMessage_changeDeliveryday += "希望市場納品日は、翌競り日に修正させていただきました。ご了承ください。"
          messagesArray.push(message_JSON.getTextMessage(textMessage_changeDeliveryday))
        }
        else{
          textMessage_changeDeliveryday += "の納品日を変更しました。"
          messagesArray.unshift(message_JSON.getTextMessage(textMessage_changeDeliveryday))
        }        
      }
      //5 買い物かご商品 1商品削除
      else if(COMMAND == "delete"){
        console.log(`${CONSOLE_STATE}: 1商品削除`)
        
        //削除
        user.property.CART.splice(CARTINFOARRAY_INDEX, 1)

        //テキストメッセージ返信
        //STATE_NEWORDER 新規発注確認: true、追加発注確認: false
        //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0
        if(user.property.CART.length > 0){
          //発注状況 リセット
          for(let i in user.property.CART){
            user.property.CART[i].orderState = 0
          }

          //DB更新
          await user.updateDB()
          messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 0)
          messagesArray.unshift(message_JSON.getTextMessage("削除しました。"))
        }
        else{
          //DB更新
          await user.updateDB()
          messagesArray = Irregular.whenZeroProductInCart()
        }        
      }
    }
    
    //単品発注処理
    else if(TAG == "instantOrder"){
      CONSOLE_STATE += ": 単品発注処理"            

      //0 発注内容確認 発注ボタン押下後、口数1~10ボタン押下後
      if(COMMAND == "check"){
        console.log(`${CONSOLE_STATE}: 発注内容確認`)
        //STATE_NEWORDER|商品情報をplSheet, productInfoArrayから取得: true
        //STATE_CHECK_DELIVERYDAY|荷受け日、ブロック日チェック 不要: false  最短納品日が格納されるため
        messagesArray = await OneOrder.getCarouselMessage(postBackData, true, false)
      }
      //1 希望口数伺い クイックリプライメッセージ
      else if(COMMAND == "selectOrderNum"){
        console.log(`${CONSOLE_STATE}: 希望口数伺い`)
        messagesArray = await Order.selectOrderNum(postBackData)        
      }
      //2 希望口数指定 postBackDataに反映
      else if(COMMAND == "setOrderNum"){
        console.log(`${CONSOLE_STATE}: 希望口数指定`)
        //postBackData書き換え
        postBackData.product.orderNum = postBackData.newOrderNum
        console.log(`after setOrderNum :${postBackData.product.orderNum}`)
        postBackData.product.orderState = 2                
        
        //CHANGE_STATE 口数変更: 1
        //STATE_NEWORDER|商品情報をDBから取得: false
        //STATE_CHECK_DELIVERYDAY|荷受け日、ブロック日チェック 不要: false
        messagesArray = await OneOrder.getCarouselMessage(postBackData, false, false)
        messagesArray.unshift(message_JSON.getTextMessage("口数を変更しました。"))
      }
      //3 希望納品日指定
      else if(COMMAND == "setDeliveryday"){
        console.log(`${CONSOLE_STATE}: 希望納品日指定`)
        //postBackData書き換え
        postBackData.product.deliveryday = Order.getUnixTimeFMDeliveryday(event.postback.params.date)
        postBackData.product.orderState = 2
        
        //CHANGE_STATE 納品日変更: 2
        //STATE_NEWORDER|商品情報をDBから取得: false
        //STATE_CHECK_DELIVERYDAY|荷受け日、ブロック日チェック 必要: true
        messagesArray = await OneOrder.getCarouselMessage(postBackData, false, true)
        messagesArray.unshift(message_JSON.getTextMessage("納品日を変更しました。"))
      }
      //4 発注確定
      else if(COMMAND == "orderConfirm"){
        console.log(`${CONSOLE_STATE}: 発注確定`)
        
        let orderArrays, plSheets
        [messagesArray, orderArrays, plSheets] = await OneOrder.orderConfirm(user, TIMESTAMP, postBackData)
        if(messagesArray.length > 0){user.httpsRequest.replyMessageByAxios(event, messagesArray)}
        console.log("メッセージ送信")

        Order.setOrderInfo(orderArrays, plSheets)
        return []
      }
      //5 再発注確定
      else if(COMMAND == "reOrderConfirm"){
        console.log(`${CONSOLE_STATE}:再発注確定`)
        
        let orderArrays, plSheets
        [messagesArray, orderArrays, plSheets] =  await OneOrder.orderConfirm(user, TIMESTAMP, postBackData)
        if(messagesArray.length > 0){user.httpsRequest.replyMessageByAxios(event, messagesArray)}
        console.log("メッセージ送信")

        Order.setOrderInfo(orderArrays, plSheets)
        return []
      }
      else{
        console.log(`${CONSOLE_STATE}: 該当イベントなし`)
      }
    }
  }
  return messagesArray
}
