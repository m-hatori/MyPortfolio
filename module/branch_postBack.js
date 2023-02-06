/* eslint-disable one-var */
const Products = require("./class ProductsList.js");
const OrderRecords = require("./class OrdersList.js");

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

  let TIME_ERROR = false, TIMESTAMP_STATE, messagesArray = [], textMessage = ""
  
  //タイムリミット確認
  const dt = TIMESTAMP_NEW - TIMESTAMP
  const timelimit = 900000 //ms 15分
  const TIMELIMIT_STATE = (dt > timelimit)
  //console.log(`差 : ${dt}m秒  タイムリミット：${TIMELIMIT_STATE}`)

  //受注締切日時 取得
  const DEADLINE = new Date()  
  DEADLINE.setHours(4); //時刻を UTC 13:00:00 に設定 13-9 = 4
  DEADLINE.setMinutes(0);
  DEADLINE.setSeconds(0);
  const UNIXTIME_DEADLINE = DEADLINE.getTime()
  
  //console.log(`送信済みメッセージタイムスタンプ: ${new Date(TIMESTAMP).toFormat("YYYY/MM/DD HH24:MI:SS")}`)
  //console.log(`イベントタイムスタンプ         : ${new Date(TIMESTAMP_NEW).toFormat("YYYY/MM/DD HH24:MI:SS")}`)
  //console.log(`発注締切日時                  : ${new Date(DEADLINE).toFormat("YYYY/MM/DD HH24:MI:SS")}`)
  
  if(TIMELIMIT_STATE){
    TIMESTAMP_STATE = "タイムアウト"
    textMessage = "15分以上が経過しているためセッションがタイムアウトしました。"
    TIME_ERROR = true
  }
  else if(TIMESTAMP < UNIXTIME_DEADLINE && UNIXTIME_DEADLINE < TIMESTAMP_NEW){
    //送信済みメッセージタイムスタンプが受注締切前、かつ送信済みメッセージからの操作が受注締切後の時ブロック
    TIMESTAMP_STATE = "受注締切時 超過"
    textMessage = "受注締切日時を過ぎました。"
    TIME_ERROR = true
  }

  if(TIME_ERROR && textMessage != ""){
    if(TAG == "cart"){
      TIMESTAMP_STATE += "買い物かご商品表示"
      
      //STATE_NEWORDER 新規発注確認: true
      //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
      //商品有無確認
      if(user.property.CART.length <= 0){return Irregular.whenZeroProductInCart()}

      messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)

      textMessage += "\n\n上の再表示した買い物かご情報より、再度手続きをお願いいたします。"
      messagesArray.push(message_JSON.getTextMessage(textMessage))    
    }
    else{
      //商品リストの一覧表示
      TIMESTAMP_STATE += "商品リスト一覧表示"
      const products = new Products(user.SSIDS.spSheetId1)
      messagesArray = await products.getUpStateAllList(1, 1, TIMESTAMP_NEW)
      textMessage += "\n\n上の再表示した商品リストより、再度手続きをお願いいたします。"
      messagesArray.push(message_JSON.getTextMessage(textMessage))
    }
  }
  else{
    TIMESTAMP_STATE = "問題なし"
  }
  console.log(`タイムスタンプ確認: ${TIMESTAMP_STATE}`)
  return [TIME_ERROR, messagesArray]
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
  console.log(`tag : ${TAG}, command : ${COMMAND}`)
  console.log(" ")

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
    //制限時間内の情報からのアクションか確認
    const timeState = await checkTimeStamp(TIMESTAMP, TIMESTAMP_NEW, TAG, user)
    if(timeState[0]){return timeState[1]}
    
    //1商品リストの商品一覧表示
    if(TAG == "productsList"){
      //productsList--TIMESTAMP/シートID/orderbutton:発注ボタンありorなし/state：掲載中or確認中
      
      const products = new Products(user.SSIDS.spSheetId1, postBackData.product.sheetId)
      messagesArray = await products.getAllproductInfo(postBackData.product.ORERBUTTON_STATE, postBackData.product.OPTION_UPSTATE, TIMESTAMP_NEW)
    }
    
    //複数発注処理（買い物かご）
    else if(TAG == "cart"){
      CONSOLE_STATE += ": 複数発注処理"
      
      //0 買い物かご 商品追加
      if(COMMAND == "add"){
        console.log(`${CONSOLE_STATE}: 商品追加`)
        if(user.property.CART.length < 10){
          //商品情報追加 配列末尾に
          await user.property.CART.push(postBackData.product)
          messagesArray.push(message_JSON.getTextMessage("追加しました。"))

          //買い物かご更新
          user.update_CartInfo()//DB更新
          return messagesArray
        }
        else{
          messagesArray.push(message_JSON.getTextMessage("買い物かごに入れられる商品数は、最大10点です。\n新しく追加するには、買い物かごから商品を削除するか、商品の発注を完了してください。"))
          return messagesArray
        }
      }

      //買い物かご商品有無確認
      if(user.property.CART.length <= 0){return Irregular.whenZeroProductInCart()}

      //0 買い物かご情報確認
      if(COMMAND == "check"){
        console.log(`${CONSOLE_STATE}: 買い物かご情報確認`)
        
        //カルーセルメッセージ取得
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
        messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)

        const textMessage = "買い物かご情報を上に表示しました。\n" +
        "買い物かご追加直後の商品は、希望口数は1、希望市場納品日は最短納品可能日が指定されています。\n\n" +
        "「口数」、「納品日」ボタンを押すと、それぞれ変更できます。\n\n" +
        "「削除」ボタンを押すと、買い物かごから削除できます。\n\n" +
        "操作が反映されていないときは、再度買い物かごボタンを押してください。"
        messagesArray.push(message_JSON.getTextMessage(textMessage))        
        return messagesArray
      }
      //買い物かご 全商品削除
      else if(COMMAND == "allDelete"){
        console.log(`${CONSOLE_STATE}: 全商品削除`)

        //買い物かごクリア
        user.property.CART = []

        //買い物かご更新
        user.update_CartInfo()//DB更新
        
        //テキストメッセージ返信
        messagesArray.push(message_JSON.getTextMessage("買い物かごを空にしました。"))
        return messagesArray
      }
      //新規発注確定
      else if(COMMAND == "orderConfirm"){
        console.log(`${CONSOLE_STATE}: 新規発注確定`)
        const orderRecords = new OrderRecords(user)
        await orderRecords.getUserOrderData()
        const reOrderConfirm_STATE = false
        return messagesArray = await Cart.orderConfirm(user, TIMESTAMP, orderRecords, reOrderConfirm_STATE)
      }
      //再発注確定
      else if(COMMAND == "reOrderConfirm"){
        console.log(`${CONSOLE_STATE}: 再発注確定`)
        const orderRecords = new OrderRecords(user)
        await orderRecords.getUserOrderData()
        const reOrderConfirm_STATE = true
        return messagesArray = await Cart.orderConfirm(user, TIMESTAMP, orderRecords, reOrderConfirm_STATE)
      }
        
    
      //買い物かご内に商品情報があるか確認
      //TODO: 連想配列の順番がバラバラだったら、そもそも見つけられない。。。
      const CARTINFOARRAY_INDEX = await (async (user, postBackData) => {
        const postBackData_TEXT = JSON.stringify(postBackData.product)
        //CARTINFOARRAY_INDEX = user.property.CART.indexOf(postBackData.product)
        let index = -1, BUFF_TEXT
        for(let i in user.property.CART){
          BUFF_TEXT = JSON.stringify(user.property.CART[i])
          if(BUFF_TEXT == postBackData_TEXT){
            index = i
            break
          }
        }
        return index
      })()

      if(CARTINFOARRAY_INDEX < 0){return Irregular.whenNoneProductInCart()}
       
      //2 希望口数伺い クイックリプライメッセージ
      else if(COMMAND == "selectOrderNum"){
        console.log(`${CONSOLE_STATE}: 希望口数伺い`)
        messagesArray = await Order.selectOrderNum(user.SSIDS.spSheetId1, postBackData)
 
        //買い物かご更新
        user.update_CartInfo()//DB更新
      }
      //3 希望口数指定 買い物かごに反映
      else if(COMMAND == "setOrderNum"){
        console.log(`${CONSOLE_STATE}: 希望口数指定`)
        
        //口数指定
        //console.log(`口数変更前 買い物かご情報： ${user.property.CART[CARTINFOARRAY_INDEX]}`)
        postBackData.product.orderNum = postBackData.newOrderNum
        user.property.CART[CARTINFOARRAY_INDEX] = postBackData.product
        //console.log(`口数変更後 買い物かご情報： ${user.property.CART[CARTINFOARRAY_INDEX]}`)

        //買い物かご カルーセルメッセージ送信
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0
        messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 0)
        messagesArray.unshift(message_JSON.getTextMessage("No." + (Number(CARTINFOARRAY_INDEX) + 1) + "の口数を変更しました。"))
        
        //買い物かご更新
        user.update_CartInfo()
      }
      //4 納品日指定 買い物かご情報に希望市場納品日を追記。メニューに切り替え。
      else if(COMMAND == "setDeliveryday"){
        console.log(`${CONSOLE_STATE}: 納品日指定`)
        //納品日更新 DB書き換え
        postBackData.product.deliveryday = event.postback.params.date
        user.property.CART[CARTINFOARRAY_INDEX] = postBackData.product

        //買い物かご カルーセルメッセージ送信
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 荷受け日・ブロック日チェック: 1
        messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 1)//希望納品日が荷受け日、ブロック日でないか確認
        messagesArray.unshift(message_JSON.getTextMessage("No." + (Number(CARTINFOARRAY_INDEX) + 1) + "の納品日を変更しました。"))

        //買い物かご更新
        user.update_CartInfo()
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
          messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 0)
        }
        messagesArray.unshift(message_JSON.getTextMessage("削除しました。"))
        
        //買い物かご更新
        user.update_CartInfo()//DB更新
      } 
    }
    
    //単品発注処理
    else if(TAG == "instantOrder"){
      CONSOLE_STATE += ": 単品発注処理"            

      //0 発注内容確認 発注ボタン押下後、口数1~10ボタン押下後
      if(COMMAND == "check"){
        console.log(`${CONSOLE_STATE}: 発注内容確認`)
        //納品日チェック STATE_CHECK_DELIVERYDAY  テキスト、納品期間チェック不要:0
        //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0  最短納品日が格納されるため
        messagesArray = await OneOrder.getCarouselMessage(user, postBackData)
      }
      //1 希望口数伺い クイックリプライメッセージ
      else if(COMMAND == "selectOrderNum"){
        console.log(`${CONSOLE_STATE}: 希望口数伺い`)
        messagesArray = await Order.selectOrderNum(user.SSIDS.spSheetId1, postBackData)
      }
      //2 希望口数指定 postBackDataに反映
      else if(COMMAND == "setOrderNum"){
        console.log(`${CONSOLE_STATE}: 希望口数指定`)
        //postBackData書き換え
        postBackData.product.orderNum = postBackData.newOrderNum
        
        //reOrderリセット
        postBackData.product.orderState = 0
        
        //納品日チェック STATE_CHECK_DELIVERYDAY  テキスト、納品期間チェック不要:0
        //CHANGE_STATE 口数変更: 1
        messagesArray = await OneOrder.getCarouselMessage(user, postBackData, 0)
        messagesArray.unshift(message_JSON.getTextMessage("口数を変更しました。"))
      }
      //3 希望納品日指定
      else if(COMMAND == "setDeliveryday"){
        console.log(`${CONSOLE_STATE}: 希望納品日指定`)
        //postBackData書き換え
        postBackData.product.deliveryday = event.postback.params.date  //yyyy-mm-dd

        //reOrderリセット
        postBackData.product.orderState = 0

        //納品日チェック STATE_CHECK_DELIVERYDAY  荷受け日、ブロック日チェック: 1
        //CHANGE_STATE 納品日変更: 2
        messagesArray = await OneOrder.getCarouselMessage(user, postBackData, 1)
        messagesArray.unshift(message_JSON.getTextMessage("納品日を変更しました。"))
      }
      //4, 5 発注確定 or 再発注確定
      else if(COMMAND == "orderConfirm" || COMMAND == "reOrderConfirm"){
        const orderRecords = new OrderRecords(user)
        await orderRecords.getUserOrderData()

        //2重発注確認
        const DOUBLE_ORDER_STATE = await orderRecords.checkOrderRecordTimeStamp(TIMESTAMP, postBackData.product.name) 
        if(DOUBLE_ORDER_STATE){
          console.error(`${CONSOLE_STATE}: エラー ダブルオーダー`)
          messagesArray.unshift(message_JSON.getTextMessage("当発注手続きは完了済みです。\nメインメニューから手続きをやり直してください。"))
          return messagesArray
        }

        if(postBackData.product.orderState == 1){
          console.log(`${CONSOLE_STATE}:再発注確定`)
          messagesArray = OneOrder.orderConfirm(user, TIMESTAMP, postBackData, orderRecords)
        }
        else{
          console.log(`${CONSOLE_STATE}: 発注確定`)
          messagesArray = OneOrder.orderConfirm(user, TIMESTAMP_NEW, postBackData, orderRecords)
        }        
      }
      else{
        console.log(`${CONSOLE_STATE}: 該当イベントなし`)
      }
    }
  }
  return messagesArray
}