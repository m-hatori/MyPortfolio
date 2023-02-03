/* eslint-disable one-var */
const postCode_JSON = require("./postCode_JSON.js");
const message_JSON = require("./message_JSON.js");
const message_JSON_irregular = require("./message_JSON_irregular.js");
const message_JSON_Order = require("./message_JSON_Order.js");
const message_JSON_OneOrder = require("./message_JSON_OneOrder.js");
const message_JSON_Cart = require("./message_JSON_Cart.js")

//const property = require("./property.js");

const Products = require("./class sheet ProductsList.js");
const OrderRecords = require("./class sheet OrdersList.js");
const StampMessage = require("./class Stamp.js");

//タイムスタンプ確認
const checkTimeStamp = async (TIMESTAMP, TIMESTAMP_NEW, POSTCODE_TAG, user) =>{
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
    if(POSTCODE_TAG == postCode_JSON.postBackTag.cart){
      TIMESTAMP_STATE += "買い物かご商品表示"
      
      //商品有無確認
      if(user.property.CART.length <= 0){return [true, message_JSON_irregular.whenZeroProductInCart()]}
  
      //STATE_NEWORDER 新規発注確認: true
      //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
      messagesArray = await message_JSON_Cart.getProductsInCart(user, TIMESTAMP_NEW, true, 2)
    
      //買い物かご内情報有
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
module.exports.postBack_process = async (event, TIMESTAMP_NEW, postBackData, user) => {
  //●共通前処理
  console.log(" ")
  let CONSOLE_STATE = "branch_postBack_process"
  let messagesArray = []

  //イベントからユーザーが閲覧した時点の商品情報を取得
  let postBackDataArray = postBackData.split("∫");//文字列「/」で分割し、配列に格納
  let postCode = postBackDataArray[postCode_JSON.postBackDataLabels.postbackCode]
  let postCodeArray = postCode.split("-")
  
  //postBackCode
  const POSTCODE_TAG = postCodeArray[postCode_JSON.postCodeLabel.postCodeTag]
  const POSTCODE_NUM = postCodeArray[postCode_JSON.postCodeLabel.postCodeNum]
  const TIMESTAMP = Number(postCodeArray[postCode_JSON.postCodeLabel.timeStamp])
  
  //メニュー処理
  if(POSTCODE_TAG == postCode_JSON.postBackTag.menu){
    //発注履歴
    if(POSTCODE_NUM == postCode_JSON.postBackNum.menu.checkOrder){
      const orderRecords = new OrderRecords(user);
      await orderRecords.getUserOrderData()
      messagesArray = orderRecords.getAllOrderRecords()
    }
    //枝番号の変更
    //else if(postCodeNum == postCode_JSON.postBackNum.menu.changeNumB){        
    //}  
    //ユーザークラス切替
    //else if(postCodeNum == postCode_JSON.postBackNum.menu.changeClass){        
    //}  
    //TBD 近隣の出荷者情報の閲覧
    //マニュアル Not postBack
    //利用規約 Not postBack
  }
  //あらゆるキャンセル
  else if(POSTCODE_TAG == postCode_JSON.postBackTag.cancel){
    messagesArray.push(message_JSON.getTextMessage("キャンセルですね。\nまたのご利用をお待ちしております。"))
    messagesArray.push(new StampMessage().何卒)
  
    //リッチメニュー切り替え 保険
    user.setRichMenu()
  }
  else{
    //制限時間内の情報からのアクションか確認
    const timeState = await checkTimeStamp(TIMESTAMP, TIMESTAMP_NEW, POSTCODE_TAG, user)
    if(timeState[0]){return timeState[1]}
    
    //1商品リストの商品一覧表示
    if(POSTCODE_TAG == "productsList"){
      //productsList--TIMESTAMP/シートID/orderbutton:発注ボタンありorなし/state：掲載中or確認中
      
      const products = new Products(user.SSIDS.spSheetId1, postBackDataArray[postCode_JSON.postBackDataLabels.sheetId])
      messagesArray = await products.getAllproductInfo(postBackDataArray[2], postBackDataArray[3], TIMESTAMP_NEW)
    }
    
    //複数発注処理（買い物かご）
    else if(POSTCODE_TAG == postCode_JSON.postBackTag.cart){
      CONSOLE_STATE += ": 複数発注処理"
      //postBackData修正
      let postBackDataForCertification = postBackData.replace(postCode, postCode_JSON.postBackTag.cart + "---")
      console.log(`照合用postBackData : ${postBackDataForCertification}`)

      //0 買い物かご 商品追加
      if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.add){
        console.log(`${CONSOLE_STATE}: 商品追加`)
        if(user.property.CART.length < 10){
          //商品情報追加 配列末尾に
          await user.property.CART.push(postBackDataForCertification)
          const textMessage = postBackDataArray[postCode_JSON.postBackDataLabels.name] + postBackDataArray[postCode_JSON.postBackDataLabels.norm] + "をカートへ入れました。"
          messagesArray.push(message_JSON.getTextMessage(textMessage))

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
      //STATE_CART[1] = cartInfoArray.length
      if(user.property.CART.length <= 0){return message_JSON_irregular.whenZeroProductInCart()}

      //0 買い物かご情報確認
      if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.check){
        console.log(`${CONSOLE_STATE}: 買い物かご情報確認`)
        //買い物かご更新
        //カルーセルメッセージ取得
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
        messagesArray = await message_JSON_Cart.getProductsInCart(user, TIMESTAMP_NEW, true, 2)

        const textMessage = "買い物かご情報を上に表示しました。\n" +
        "買い物かご追加直後の商品は、希望口数は1、希望市場納品日は最短納品可能日が指定されています。\n\n" +
        "「口数」、「納品日」ボタンを押すと、それぞれ変更できます。\n\n" +
        "「削除」ボタンを押すと、買い物かごから削除できます。\n\n" +
        "操作が反映されていないときは、再度買い物かごボタンを押してください。"
        messagesArray.push(message_JSON.getTextMessage(textMessage))        
        return messagesArray
      }

      //7, 8発注確定
      else if(POSTCODE_NUM >= postCode_JSON.postBackNum.cart.orderConfirm){
        const orderRecords = new OrderRecords(user)
        await orderRecords.getUserOrderData()

        //2重発注確認
        const DOUBLE_ORDER_STATE = orderRecords.checkOrderRecordTimeStamp(TIMESTAMP, postBackDataArray[postCode_JSON.postBackDataLabels.name])
        if(DOUBLE_ORDER_STATE){
          console.error(`${CONSOLE_STATE}: エラー ダブルオーダー`)
          messagesArray.push(message_JSON.getTextMessage("当発注手続きは完了済みです。\nメインメニューから再度手続きをお願いします。"))
          return messagesArray
        }
        
        //●6 新規発注確定
        let reOrderConfirm_STATE
        if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.orderConfirm){
          console.log(`${CONSOLE_STATE}: 新規発注確定`)
          reOrderConfirm_STATE = false
        }
        //●7 再発注確定
        else if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.reOrderConfirm){
          console.log(`${CONSOLE_STATE}: 再発注確定`)
          reOrderConfirm_STATE = true            
        }
        return messagesArray = await message_JSON_Cart.orderCartProductsConfirm(user, TIMESTAMP, orderRecords, reOrderConfirm_STATE)        
      }      

      //買い物かご内に商品情報があるか確認
      user.CARTINFOARRAY_INDEX = user.property.CART.indexOf(postBackDataForCertification)
      if(user.CARTINFOARRAY_INDEX < 0){return message_JSON_irregular.whenNoneProductInCart()}
      
      //1 買い物かご 全商品削除
      if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.allDelete){
        console.log(`${CONSOLE_STATE}: 全商品削除`)

        //買い物かごクリア
        user.property.CART = []

         //テキストメッセージ返信
        messagesArray.push(message_JSON.getTextMessage("買い物かごを空にしました。"))

        //買い物かご更新
        user.update_CartInfo()//DB更新
      }        
      //2 希望口数伺い クイックリプライメッセージ
      else if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.orderNum){
        console.log(`${CONSOLE_STATE}: 希望口数伺い`)
        messagesArray = await message_JSON_Order.setOrderNum(TIMESTAMP, postBackData, postBackDataArray, POSTCODE_TAG, user)
 
        //買い物かご更新
        user.update_CartInfo()//DB更新
      }
      //3 希望口数指定 買い物かごに反映
      else if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.setOrderNum){
        console.log(`${CONSOLE_STATE}: 希望口数指定`)
        postBackDataForCertification = await postBackDataForCertification.replace(`${postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday]}∫${postBackDataArray[postCode_JSON.postBackDataLabels.newOrderNum]}`, `${postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday]}`)
        //console.log(`口数指定時 照合用postBackData: ${postBackDataForCertification}`)
        
        //口数指定
        //console.log(`口数変更前 買い物かご情報： ${user.property.CART[user.CARTINFOARRAY_INDEX]}`)
        user.property.CART[user.CARTINFOARRAY_INDEX] = postBackDataForCertification.replace("∫"+ postBackDataArray[postCode_JSON.postBackDataLabels.orderNum], "∫"+ postBackDataArray[postCode_JSON.postBackDataLabels.newOrderNum])
        //console.log(`口数変更後 買い物かご情報： ${user.property.CART[user.CARTINFOARRAY_INDEX]}`)

        //買い物かご カルーセルメッセージ送信
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0
        messagesArray = await message_JSON_Cart.getProductsInCart(user, TIMESTAMP_NEW, true, 0)
        messagesArray.unshift(message_JSON.getTextMessage("No." + (Number(user.CARTINFOARRAY_INDEX) + 1) + "の口数を変更しました。"))
        
        //買い物かご更新
        user.update_CartInfo()//DB更新        
      }
      //4 納品日指定 買い物かご情報に希望市場納品日を追記。メニューに切り替え。
      else if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.setDeliveryday){
        console.log(`${CONSOLE_STATE}: 納品日指定`)
        //納品日更新 DB書き換え
        user.property.CART[user.CARTINFOARRAY_INDEX] = postBackDataForCertification.replace(postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday], event.postback.params.date)

        //買い物かご カルーセルメッセージ送信
        //STATE_NEWORDER 新規発注確認: true
        //STATE_CHECK_DELIVERYDAY 荷受け日・ブロック日チェック: 1
        messagesArray = await message_JSON_Cart.getProductsInCart(user, TIMESTAMP_NEW, true, 1)//希望納品日が荷受け日、ブロック日でないか確認
        messagesArray.unshift(message_JSON.getTextMessage("No." + (Number(user.CARTINFOARRAY_INDEX) + 1) + "の納品日を変更しました。"))

        //買い物かご更新
        user.update_CartInfo()//DB更新        
      }
      //5 買い物かご商品 1商品削除
      else if(POSTCODE_NUM == postCode_JSON.postBackNum.cart.delete){
        console.log(`${CONSOLE_STATE}: 1商品削除`)
        //削除
        user.property.CART.splice(user.CARTINFOARRAY_INDEX, 1)    
        
        //テキストメッセージ返信
        //STATE_NEWORDER 新規発注確認: true、追加発注確認: false
        //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0
        messagesArray = await message_JSON_Cart.getProductsInCart(user, TIMESTAMP_NEW, true, 0)
        messagesArray.unshift(message_JSON.getTextMessage("削除しました。"))
        
        //買い物かご更新
        user.update_CartInfo()//DB更新
      } 
    }
    
    //単品発注処理
    else if(POSTCODE_TAG == postCode_JSON.postBackTag.instantOrder){
      CONSOLE_STATE += ": 単品発注処理"
      //CHECK_ORDER_STATE 発注情報 未確認: 0,  発注情報 未確認(2回目以降はテキストメッセージ不要):2, 発注情報 確認済み: 1
      const CHECK_ORDER_STATE = Number(postBackDataArray[postCode_JSON.postBackDataLabels.orderState])

      //0 発注内容確認 発注ボタン押下後、口数1~10ボタン押下後
      if(POSTCODE_NUM == postCode_JSON.postBackNum.instantOrder.check){
        //納品日チェック STATE_CHECK_DELIVERYDAY  テキスト、納品期間チェック不要:0
        //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0  最短納品日が格納されるため
        messagesArray = await message_JSON_OneOrder.getCarouselOneOrderCeritification(user, TIMESTAMP_NEW, postBackData, postBackDataArray, CHECK_ORDER_STATE, postBackDataArray[postCode_JSON.postBackDataLabels.orderNum], postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday])
      }
      //1 希望口数伺い クイックリプライメッセージ
      else if(POSTCODE_NUM == postCode_JSON.postBackNum.instantOrder.setOrderNum){
        console.log(`${CONSOLE_STATE}: 希望口数伺い`)
        messagesArray = await message_JSON_Order.setOrderNum(TIMESTAMP_NEW, postBackData, postBackDataArray, POSTCODE_TAG, user);
      }
      //2 希望口数指定 postBackDataに反映
      else if(POSTCODE_NUM == postCode_JSON.postBackNum.instantOrder.orderNumConfirm){
        console.log(`${CONSOLE_STATE}: 希望口数指定`)
        //postBackData書き換え
        postBackData = postBackData.replace(postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday] + "∫" + postBackDataArray[postCode_JSON.postBackDataLabels.newOrderNum], postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday])  //末尾newOrderを削除
        postBackData = postBackData.replace("∫" + postBackDataArray[postCode_JSON.postBackDataLabels.orderNum], "∫" + postBackDataArray[postCode_JSON.postBackDataLabels.newOrderNum])
        
        //reOrderリセット
        postBackData = postBackData.replace("∫1∫on", "∫0∫on")
        postBackDataArray = postBackData.split("∫")
        //納品日チェック STATE_CHECK_DELIVERYDAY  テキスト、納品期間チェック不要:0
        //CHANGE_STATE 口数変更: 1
        messagesArray = await message_JSON_OneOrder.getCarouselOneOrderCeritification(user, TIMESTAMP_NEW, postBackData, postBackDataArray, CHECK_ORDER_STATE, postBackDataArray[postCode_JSON.postBackDataLabels.orderNum], postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday], 0, 1)
      }
      //3 希望納品日指定
      else if(POSTCODE_NUM == postCode_JSON.postBackNum.instantOrder.setDeliveryday){
        console.log(`${CONSOLE_STATE}: 希望納品日指定`)
        //イベントから指定日を取得
        const deliveryday = event.postback.params.date  //yyyy-mm-dd

        //postBackData書き換え
        postBackData = postBackData.replace(postBackDataArray[postCode_JSON.postBackDataLabels.deliveryday], deliveryday)

        //reOrderリセット
        postBackData = postBackData.replace("∫1∫on", "∫0∫on")
        postBackDataArray = postBackData.split("∫")
        //納品日チェック STATE_CHECK_DELIVERYDAY  荷受け日、ブロック日チェック: 1
        //CHANGE_STATE 納品日変更: 2
        messagesArray = await message_JSON_OneOrder.getCarouselOneOrderCeritification(user, TIMESTAMP_NEW, postBackData, postBackDataArray, CHECK_ORDER_STATE,  postBackDataArray[postCode_JSON.postBackDataLabels.orderNum], deliveryday, 1, 2)
      }
      //4, 5 発注確定 or 再発注確定
      else if(POSTCODE_NUM == postCode_JSON.postBackNum.instantOrder.orderConfirm || POSTCODE_NUM == postCode_JSON.postBackNum.instantOrder.reOrderConfirm){
        const orderRecords = new OrderRecords(user)
        await orderRecords.getUserOrderData()

        //2重発注確認
        const DOUBLE_ORDER_STATE = await orderRecords.checkOrderRecordTimeStamp(TIMESTAMP, postBackDataArray[postCode_JSON.postBackDataLabels.name]) 
        if(DOUBLE_ORDER_STATE){
          console.error(`${CONSOLE_STATE}: エラー ダブルオーダー`)
          messagesArray.unshift(message_JSON.getTextMessage("当発注手続きは完了済みです。\nメインメニューから手続きをやり直してください。"))
          return messagesArray
        }

        if(CHECK_ORDER_STATE == 1){
          console.log(`${CONSOLE_STATE}:再発注確定`)
          messagesArray = message_JSON_OneOrder.orderConfirm(user, TIMESTAMP, postBackData, postBackDataArray, CHECK_ORDER_STATE, orderRecords)
        }
        else{
          console.log(`${CONSOLE_STATE}: 発注確定`)
          messagesArray = message_JSON_OneOrder.orderConfirm(user, TIMESTAMP_NEW, postBackData, postBackDataArray, CHECK_ORDER_STATE, orderRecords)
        }        
      }
      else{
        console.log(`${CONSOLE_STATE}: 該当イベントなし`)
      }
    }
  }
  return messagesArray
}