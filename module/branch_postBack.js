/* eslint-disable one-var */
const functions = require('firebase-functions');
const logger = functions.logger

const timeMethod = require("./getTime.js");

const Products = require("./class ProductsList.js");
const OrderRecords = require("./class OrdersList.js");

const { getUpStateAllList } = require("./npm API/FireStore_API.js");

//const StampMessage = require("./LINE_Messaging_API/Class Stamp.js");
const message_JSON = require("./LINE_Messaging_API/message_JSON.js");
const Irregular = require("./LINE_Messaging_API/Irregular.js");
const Order = require("./LINE_Messaging_API/Order.js");
const OneOrder = require("./LINE_Messaging_API/OneOrder.js");
const Cart = require("./LINE_Messaging_API/Cart.js")


//タイムスタンプ確認
const checkTimeStamp = async (postBackData_timeStamp, TIMESTAMP_NEW, TAG, user) =>{
  if(postBackData_timeStamp === undefined ||  postBackData_timeStamp == ""){
    throw new Error(`postback_timeStampに問題があります。`)
  }
  
  //タイムリミット
  const dt = TIMESTAMP_NEW - postBackData_timeStamp
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
  else if(postBackData_timeStamp <= UNIXTIME_DEADLINE && UNIXTIME_DEADLINE <= TIMESTAMP_NEW){
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

      //リッチメニュー切り替え 保険
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

//買い物かご内 1商品情報 有無確認
const getIndex = async (user, postBackData) => {
  let index = -1, BUFF_TEXT, state = "-買い物かご内 商品情報 なし"
  for(let i in user.property.CART){
    BUFF_TEXT = user.property.CART[i]
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
      index = i
      state = `-買い物かご内 商品情報 あり index: ${index}`
      break
    }
  }
  console.log(state)
  return index
}

//ポストバック処理分岐
//TODO: ケース別に最終的にトーク画面に表示する情報を最適化
module.exports.process = async (event, TIMESTAMP_NEW, user, postBackData) => {
  //●共通前処理  
  let CONSOLE_STATE = "branch_postBack_process"
  let messagesArray = [], orderArrays = [], plSheets = null
  
  //postBackCode
  const TAG = postBackData.tag
  const COMMAND = postBackData.command
  const postBackData_timeStamp = Number(postBackData.timeStamp)

  /*
  if(postBackData.product === undefined || postBackData.product === null){
    logger.error(JSON.stringify(postBackData.product))
  } 
  */
  
  //メニュー処理
  if(TAG == "menu"){
    //発注履歴
    if(COMMAND == "checkOrderRecord"){
      const orderRecords = new OrderRecords(user);
      await orderRecords.getDB()
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
  
    //リッチメニュー切り替え 保険
    user.setRichMenu()
  }  
  //1商品リストの商品一覧表示
  else if(TAG == "productsList"){
    let lineNum = true
    if(COMMAND == "continuation"){ lineNum = false }
    //console.log(postBackData.product.sheetId, postBackData.product.ORERBUTTON_STATE, postBackData.product.OPTION_UPSTATE)
    messagesArray = await new Products(postBackData.product.sheetId).getAllproductInfo(postBackData, TIMESTAMP_NEW, lineNum)
  }
  else{
    //TODO: 商品リスト一覧表示
    /*
    if(TAG == "allList"){
      let lineNum = true
      if(COMMAND == "continuation"){ lineNum = false }
      messagesArray = await getUpStateAllList(TIMESTAMP_NEW, lineNum)      
    }
    */

    
    //制限時間内の情報からのアクションか確認
    let timeError
    [timeError, messagesArray] = await checkTimeStamp(postBackData_timeStamp, TIMESTAMP_NEW, TAG, user)    
    if(timeError) return messagesArray
    
    //複数発注処理（買い物かご）
    if(TAG == "cart"){
      CONSOLE_STATE += ": 複数発注処理"
      
      //1,買い物かご内 にある商品情報有無に関せず行う操作
      //買い物かご 商品追加
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
        }
        else{
          messagesArray.push(message_JSON.getTextMessage("買い物かごに入れられる商品数は、最大10点です。\n新しく追加するには、買い物かごから商品を削除するか、買い物かご内にある商品の発注を完了してください。"))
        }
      }
      //買い物かご 商品数0以上有無確認
      else if(user.property.CART.length <= 0){        
        messagesArray = await Irregular.whenZeroProductInCart(TIMESTAMP_NEW)
      }      
      else{
        //2,買い物かご内 にある全商品情報に対しての操作
        //買い物かご情報閲覧
        if(COMMAND == "check"){
          console.log(`${CONSOLE_STATE}: 買い物かご情報確認`)

          //リッチメニュー切り替え 保険
          user.setRichMenu()

          //カルーセルメッセージ取得
          //STATE_NEWORDER 新規発注確認: true
          //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
          messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)
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
        }
        //新規発注確定
        else if(COMMAND == "orderConfirm"){
          console.log(`${CONSOLE_STATE}: 新規発注確定`)
          const reOrderConfirm_STATE = false
          [messagesArray, orderArrays, plSheets] = await Cart.orderConfirm(user, postBackData_timeStamp, reOrderConfirm_STATE)
          return await Order.setOrderInfo(event, messagesArray, user, orderArrays, plSheets)
        }
        //再発注確定
        else if(COMMAND == "reOrderConfirm"){
          console.log(`${CONSOLE_STATE}: 再発注確定`)
          const reOrderConfirm_STATE = true
          [messagesArray, orderArrays, plSheets] = await Cart.orderConfirm(user, postBackData_timeStamp, reOrderConfirm_STATE)
          return await Order.setOrderInfo(event, messagesArray, user, orderArrays, plSheets)
        }

        //3,買い物かご内 にある1商品情報に対しての操作
        else{
          //買い物かご内 1商品情報 有無確認
          const CARTINFOARRAY_INDEX = await getIndex(user, postBackData)
          if(CARTINFOARRAY_INDEX < 0){
            console.log(`----買い物かご内 該当商品なし----` )
            
            //買い物かご カルーセルメッセージ取得
            //STATE_NEWORDER 新規発注確認: true
            //STATE_CHECK_DELIVERYDAY 納品期間チェック: 2
            messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 2)
            messagesArray.unshift(message_JSON.getTextMessage("現在、買い物かごに該当の商品はありません。"));
          }
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

            //買い物かご更新
            await user.updateDB()

            //買い物かご カルーセルメッセージ作成
            //STATE_NEWORDER 新規発注確認: true
            //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0
            messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 0)
            messagesArray.unshift(message_JSON.getTextMessage("No." + (Number(CARTINFOARRAY_INDEX) + 1) + "の口数を変更しました。"))
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
            
            //買い物かご更新
            await user.updateDB()

            //買い物かご カルーセルメッセージ作成
            //STATE_NEWORDER 新規発注確認: true
            //STATE_CHECK_DELIVERYDAY 納品日がテキストでなく、納品日チェックが不要        
            messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 0)

            //荷受け日、ブロック日確認結果をメッセージに追記
            let textMessage_changeDeliveryday = "商品No." + (Number(CARTINFOARRAY_INDEX) + 1)
            if(changeStateDeliveryday){
              textMessage_changeDeliveryday += "\n翌競り日に修正させていただきました。ご了承ください。"
              messagesArray.push(message_JSON.getTextMessage(textMessage_changeDeliveryday))
            }
            else{
              textMessage_changeDeliveryday += "\n納品日を変更しました。"
              messagesArray.unshift(message_JSON.getTextMessage(textMessage_changeDeliveryday))
            }
          }
          //5 買い物かご商品 1商品削除
          else if(COMMAND == "delete"){
            console.log(`${CONSOLE_STATE}: 1商品削除`)
            
            //1商品情報削除
            user.property.CART.splice(CARTINFOARRAY_INDEX, 1)

            //テキストメッセージ返信
            //STATE_NEWORDER 新規発注確認: true、追加発注確認: false
            //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0
            if(user.property.CART.length > 0){
              //発注状況 リセット
              for(let i in user.property.CART){
                user.property.CART[i].orderState = 0
              }

              //買い物かご更新
              await user.updateDB()
              
              messagesArray = await Cart.getCarouselMessage(user, TIMESTAMP_NEW, true, 0)
              messagesArray.unshift(message_JSON.getTextMessage("削除しました。"))
            }
            else{              
              //買い物かご更新
              await user.updateDB()

              //TODO: 商品リストを再表示させるか
              messagesArray = await Irregular.whenZeroProductInCart(TIMESTAMP_NEW)
            }
          }
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
        [messagesArray, orderArrays, plSheets] = await OneOrder.orderConfirm(TIMESTAMP_NEW, user, postBackData_timeStamp, postBackData)
        return await Order.setOrderInfo(event, messagesArray, user, orderArrays, plSheets)
      }
      //5 再発注確定
      else if(COMMAND == "reOrderConfirm"){
        console.log(`${CONSOLE_STATE}:再発注確定`)
        [messagesArray, orderArrays, plSheets] = await OneOrder.orderConfirm(TIMESTAMP_NEW, user, postBackData_timeStamp, postBackData)
        return await Order.setOrderInfo(event, messagesArray, user, orderArrays, plSheets)
      }
      else{
        console.log(`${CONSOLE_STATE}: 該当イベントなし`)
      }
    }
  }
  return messagesArray
}
