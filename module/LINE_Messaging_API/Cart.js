/* eslint-disable one-var */
const functions = require('firebase-functions');
const logger = functions.logger

const property = require("../property.js");
const timeMethod = require("../getTime.js");

const OrderRecords = require("../class OrdersList.js");

const message_JSON = require("./message_JSON.js");
const flexMessage_ForBuyer = require("./Flex Message Parts For Buyer.js");
const Order = require("./Order.js");
const StampMessage = require("./Class Stamp.js");

const AsyncLock = require(`async-lock`);

//排他制御
const lock = new AsyncLock({
  //timeout: 60*1000, // タイムアウトを指定 - ロックを取得する前にアイテムがキューに留まることができる最大時間
  //maxOccupationTime: 60*1000, // 最大占有時間を指定 - キューに入ってから実行を完了するまでの最大許容時間
  maxExecutionTime: 5*60*1000, // 最大実行時間を指定 - ロックを取得してから実行を完了するまでの最大許容時間
  //maxPending: 10 // 保留中のタスクの最大数を設定 - 一度にキューで許可されるタスクの最大数
});


//●商品情報チェック
//商品リストと一致するか照合
//比較対象：商品名、出荷者、サイズ入数販売単価
const checkProductInfo = (postBackData, productInfoArray) => {
  //console.log(`照合 postBackData - SS情報`)
  const mData = getTextbyMasterData(productInfoArray)
  const pData = getTextbyPostData(postBackData)      
  
  //商品情報がリストと一致しないとき、または未掲載のとき
  if(mData != pData || productInfoArray[property.constPL.columns.upState] === false){
    logger.warn(`---商品リストとpostBackDataを照合 不一致,または未掲載`)
    logger.warn(`----mData : ${mData}`)
    logger.warn(`----pData : ${pData}`)
    logger.warn(`----upState : ${productInfoArray[property.constPL.columns.upState]}`)
    
    return true
  }
  else{
    console.log(`---商品リストとpostBackDataを照合 一致`)
    return false
  }
}

//●商品情報 スプレッドシート情報 照合用テキスト取得
const getTextbyMasterData = (productInfoArray) => {
  return productInfoArray[property.constPL.columns.numA] + "-" + productInfoArray[property.constPL.columns.numB] +
    //productInfoArray[property.constPL.columns.name].replace(/\n/g, "") +
    productInfoArray[property.constPL.columns.name] +
    productInfoArray[property.constPL.columns.norm]
}

//●商品情報 postBackData 照合用テキスト取得
const getTextbyPostData = (postBackData) => {
  return postBackData.product.producer.split(" ")[0] +
  postBackData.product.name + postBackData.product.norm
}

//買い物かご内に同一商品が複数あるかチェック
const checkSameProductsInCart = (i, user, postBackData) => {
  for (let j in user.property.CART){
    if(i != j &&
      user.property.CART[j].producer == postBackData.product.producer &&
      user.property.CART[j].name == postBackData.product.name &&
      user.property.CART[j].norm == postBackData.product.norm &&
      user.property.CART[j].deliveryday == postBackData.product.deliveryday
    ){
      console.log(`---商品重複`)
      return true
    }
  }
  return false
}

//再伺いメッセージ取得
//TODO: 納品日がテキストのとき 追加発注ボタンを表示しない。どう仕分けるか。
const getReOrderTextMessage = (cartInfoArray_doubleOrder, cartInfoArray_doubleCart) => {
  let textMessage = ""

  //発注履歴にダブり 
  if(cartInfoArray_doubleOrder.length != 0){
    textMessage += "以下の商品は、同納品日に発注済みです。\n";
    for(let buff of cartInfoArray_doubleOrder){
      //納品日：商品名
      textMessage += buff + "\n\n";
    }
  }

  //買い物かご内にダブり
  if(cartInfoArray_doubleCart.length != 0){
    //納品日：商品名
    textMessage += "以下の商品は、同一商品を同納品日に重複発注しようとしています。\n";
    for(let buff of cartInfoArray_doubleCart){
      //納品日：商品名
      textMessage += buff + "\n\n"
    }
  }

  //再発注メッセージ
  if(cartInfoArray_doubleOrder.length != 0 || cartInfoArray_doubleCart.length != 0){
    textMessage += "問題なければ、もう一度上の発注確定ボタンを押してください。"
  }  
  return textMessage
}

//●複数 発注内容確認（買い物かご情報表示）
//引数
//STATE_NEWORDER 新規発注確認: true、追加発注確認: false
//STATE_CHECK_DELIVERYDAY :0 納品日チェックしない、 1：荷受け日・ブロック日チェック、2：納品期間チェック
module.exports.getCarouselMessage = async (user, postBackData_timeStamp, STATE_NEWORDER, STATE_CHECK_DELIVERYDAY) => {
  const func_name = `複数 発注内容確認`

  //●前処理
  //変数定義:メッセージ
  let messagesArray = []      
  let STATE_TEXT, changeCart = false, textOrderNum = "", textDeliveryday = "", textDeliverydayState = [false, "商品No."]
  let card, columns = []
  let bodyContents  = [], imageContents = [], footerContents = []

  //変数定義:商品リスト情報
  let plSheets ={}
  let cartPNum, picUrl

  //●メッセージ作成
  //買い物かご内 商品カード作成ループ  
  for (let i in user.property.CART){
    console.log(`\n買い物かご配列: ${i}`)
    let postBackData = {
      timeStamp: postBackData_timeStamp,
      tag: "cart",
      product: user.property.CART[i]
    }
  
    //変数取得
    cartPNum = Number(i) + 1
    //imageContents = flexMessage_ForBuyer.getCardlabel(imageContents, `買い物かご商品No.${cartPNum} 発注内容`)  //上部ラベル
    let title = `買い物かご商品No.${cartPNum} 発注内容`
    
    //商品リストインスタンス、情報取得
    const buff = plSheets[postBackData.product.sheetId]
    let plSheet, productInfoArray
    if(buff !== undefined){
      plSheet = buff.plSheet
      productInfoArray = plSheet.plSheetVals[postBackData.product.productId]
    }
    else{
      [plSheet, productInfoArray] = await Order.getProductsInfo(postBackData);
      plSheets[postBackData.product.sheetId] = {
        plSheet: plSheet
      };
    }

    //商品情報確認
    const STOCKNOW = productInfoArray[property.constPL.columns.stockNow]
    const STATE_PRODUCTINFO = checkProductInfo(postBackData, productInfoArray)    
    if(STOCKNOW <= 0 || STATE_PRODUCTINFO){
      console.log(`--在庫なし。または未掲載、または商品情報不一致`)
      //●口数
      textOrderNum = "-"
      
      //●納品日
      textDeliveryday = "-"
      
      //body
      picUrl = process.env.PICURL_SOLDOUT //完売画像

      //footer 口数、納品日ボタン 非表示
      footerContents.push({
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "当商品は受注を\n締め切りました。",
            "size": "md",
            "wrap": true
          }                  
        ],
        "spacing": "sm",
        "paddingStart": "xl",
        "paddingEnd": "xl"        
      })
    }
    else{
      console.log(`--在庫あり、かつ商品情報一致`)
      //●口数
      textOrderNum = "希望口数：" + postBackData.product.orderNum;

      //●納品日
      //納品日がテキスト確認
      [STATE_TEXT, postBackData.product.deliveryday] = Order.chechkTextDeliveryday(postBackData.product.deliveryday);

      //納品日がテキスト
      if(STATE_TEXT){
        textDeliveryday = "希望市場納品日：" + postBackData.product.deliveryday

        //納品期間外メッセージ
        textDeliverydayState[0] = true
        if(textDeliverydayState[1] == "商品No."){
          textDeliverydayState[1] += cartPNum
        }
        else{
          textDeliverydayState[1] += ", " + cartPNum
        }
      }
      //納品日がテキストでなく、納品日チェックが不要
      else if(STATE_CHECK_DELIVERYDAY == 0){
        textDeliveryday = "希望市場納品日：" + timeMethod.getDateFmt(postBackData.product.deliveryday, "orderList_deliveryday")
      }
      //荷受け日、ブロック日確認 branch_postBack にて実行
      //else if(STATE_CHECK_DELIVERYDAY == 1){
      //  textDeliveryday = "希望市場納品日：" + timeMethod.getDateFmt(postBackData.product.deliveryday, "orderList_deliveryday") + "\n※翌競り日に変更しました" //テキスト
      //} 
      //納品期間確認
      else if(STATE_CHECK_DELIVERYDAY == 2){
        const [newDeliveryday, changeStateDeliveryday] = timeMethod.checkdeliveryPeriod(postBackData.product.deliveryday, productInfoArray)
         
        //変わったらpostBackData書き換え
        if(changeStateDeliveryday){
          changeCart = true

          postBackData.product.deliveryday = newDeliveryday
          user.property.CART[i] = postBackData.product
          textDeliveryday = "希望市場納品日：" + newDeliveryday //テキスト
          
          //注意メッセージ 追記 納品期間外メッセージ
          textDeliverydayState[0] = true
          if(textDeliverydayState[1] == "商品No."){
            textDeliverydayState[1] += cartPNum
          }
          else{
            textDeliverydayState[1] += ", " + cartPNum
          }
        }
        else{
          textDeliveryday = "希望市場納品日：" + timeMethod.getDateFmt(postBackData.product.deliveryday, "orderList_deliveryday")
        }        
      }

      //body
      imageContents = await flexMessage_ForBuyer.getCardbodyStockNow(imageContents, `残${STOCKNOW}口`)  //残口
      picUrl = productInfoArray[property.constPL.columns.picUrl] //商品画像
            
      //footer 口数、納品日ボタンを表示
      let postBackData_selectOrderNum = postBackData
      postBackData_selectOrderNum.command = "selectOrderNum"
      footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWidth("口数", `買い物かご商品No.${cartPNum}の口数変更`, postBackData_selectOrderNum, "30%"))      

      let postBackData_setDeliveryday = postBackData
      postBackData_setDeliveryday.command = "setDeliveryday"
      footerContents.push(flexMessage_ForBuyer.getCardfooterDeliverydayBottun("納品日", postBackData_setDeliveryday, productInfoArray))
    }
    
    //body 共通
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(picUrl), imageContents))//商品情報１  画像、残口追加
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(productInfoArray))//商品情報2   商品名～市場納品期間
    bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo(textOrderNum, textDeliveryday))//発注情報

    //footer 共通
    let postBackData_delete = postBackData
    postBackData_delete.command = "delete"
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWidth("削除", "削除", postBackData_delete, "30%"))

    card = flexMessage_ForBuyer.getProductCardForBuyer(title, bodyContents, footerContents)
    columns.push(card)
  
    //初期化
    textOrderNum = "", textDeliveryday = ""
    bodyContents  = [], imageContents = [], footerContents = []
  }

  //●右端カード 発注確定ボタン、全削除
  //TODO: スキップ 再発注メッセージ、発注確定ボタンを表示しない条件決め
  //条件：口数、納品日がテキスト
  let textMessage = ""
  //発注確定 全削除ボタン
  const postBackData_allDelete = {
    timeStamp: postBackData_timeStamp,
    tag: "cart",
    command: "allDelete"
  }  
  if(textDeliverydayState[0]){
    textMessage += textDeliverydayState[1] + "は時間経過により納品期間外の日付が指定されています。\n希望納品日を再指定してください。"
    
    //説明文
    let explainText = 
      "商品・口数・納品日を\nご確認ください。\n\n" +
      "「買い物かごリセット」ボタンを押すと、買い物かご内の商品がすべて削除できます。"    
    const endCard = flexMessage_ForBuyer.getCardOnlyNegativeBottun(explainText, "買い物かご\nリセット", postBackData_allDelete)
    columns.push(endCard)    
  }
  else{
    //新規発注のみ
    let postBackData_OrderConfirm = {
      timeStamp: postBackData_timeStamp,
      tag: "cart",    
    }

    //説明文
    let explainText = "商品・口数・納品日を\nご確認ください。\n\n問題なければ下の\n「発注確定」ボタンを押してください。\n\n" +
      "操作が反映されていないときは、再度買い物かごボタンを押してください。"
        
    let endCard
    if(STATE_NEWORDER){
      postBackData_OrderConfirm.command = "orderConfirm"
      endCard = flexMessage_ForBuyer.getCardOrderCertification(explainText, "発注確定", postBackData_OrderConfirm, "買い物かご\nリセット", postBackData_allDelete)
    }
    //再発注伺い
    else{
      postBackData_OrderConfirm.command = "reOrderConfirm"
      endCard = flexMessage_ForBuyer.getCardOrderCertification(explainText, "追加発注確定", postBackData_OrderConfirm, "買い物かご\nリセット", postBackData_allDelete)
    }
    columns.push(endCard)
  }
  
  //メッセージ格納
  messagesArray.push(message_JSON.getflexCarouselMessage("買い物かご内商品一覧", columns))
  if(textMessage != ""){messagesArray.push(message_JSON.getTextMessage(textMessage))}

  //●後処理
  //口数・納品日変更、再発注なら,firestoreのユーザー情報書き換え
  if(changeCart){await user.updateDB()}

  return messagesArray
}

//●発注確定
//reOrderConfirm_STATE true：再発注, false：新規発注
module.exports.orderConfirm = async (user, postBackData_timeStamp, reOrderConfirm_STATE) => {
  const key = `発注情報仕分け`
  return await lock.acquire(key, async () => {
    //●前処理
    //変数定義:メッセージ
    let messagesArray = []

    //変数定義:商品リスト情報
    const plSheets = {}

    //変数定義:発注情報
    const orderArrays = []
    let textProdcutsOrderConfirm = ""
    const cartInfoArray_OrderPattern = [], cartInfoArray_doubleOrder = [], cartInfoArray_doubleCart = []

    //発注履歴取得
    const orderRecords = new OrderRecords(user)
    await orderRecords.getDB()

    //●発注情報 仕分け
    for (let i in user.property.CART){
      //買い物かご 1商品情報抽出
      let postBackData = {
        timeStamp: postBackData_timeStamp,
        tag: "cart",
        product: user.property.CART[i]
      }    
      console.log(`買い物かご配列: ${i} ${JSON.stringify(postBackData.product)}`)
      
      //posaBackDataからスプレッドシートの情報を取得
      //商品リストインスタンス、情報取得
      const buff = plSheets[postBackData.product.sheetId]
      let plSheet, productInfoArray
      if(buff !== undefined){
        //console.log(`--producstList インスタンスあり`)
        plSheet = buff.plSheet
        productInfoArray = plSheet.plSheetVals[postBackData.product.productId]
      }
      else{
        //console.log(`--producstList インスタンスなし`)
        [plSheet, productInfoArray] = await Order.getProductsInfo(postBackData);
        plSheets[postBackData.product.sheetId] = {
          plSheet: plSheet,
          order: []
        };
      }
      
      //商品情報確認
      const STOCKNOW = productInfoArray[property.constPL.columns.stockNow]
      //console.log(`STOCKNOW: ${STOCKNOW}`)
      const upState = productInfoArray[property.constPL.columns.upState]
      //console.log(`upState: ${upState}`)
      const STATE_PRODUCTINFO = checkProductInfo(postBackData, productInfoArray)
      //console.log(`STATE_PRODUCTINFO: ${STATE_PRODUCTINFO}`)

      //口数確認 不要
      //納品日確認 不要 発注内容確認時に確認しているのと、受注締切後はブロックするから。
      //ただし、発注確定後の納品日はチェックせずに許容する。

      //発注情報チェック
        //発注不可条件 → 再発注伺い
          //未掲載、または在庫<0、またはスプレッドシートと商品情報が不一致、または希望納品日が日付でない
        
        //再発注ボタン押下時 発注可能条件
          //発注不可条件に該当せず、reOrder = 1 ：発注情報確認済み

        //新規発注ボタン押下時 発注可能条件
        //再発注伺い 条件
          //発注不可条件に該当せず、reOrder = 0：発注情報未確認
            //買い物かご内に同一商品がある →  再発注確認
            //発注履歴有、かつ各発注履歴について、発注しようとしている情報との重複がある → 再発注 

        //発注時処置
          //orderArraysにorderArrayを格納
          //在庫数
        //再発注伺い時処置 postBackData.product.orderNum = 1
      
      let textProdcut = "●" + postBackData.product.name + "\n" +
      postBackData.product.norm + "\n" +
      "希望口数: " + postBackData.product.orderNum + "\n"
      if(!upState || STOCKNOW <= 0 || STATE_PRODUCTINFO || Order.chechkTextDeliveryday(postBackData.product.deliveryday)[0]){
        console.log(`--0 発注不可商品`) //そのまま買い物かご内に残しておく
        cartInfoArray_OrderPattern.push(0)
      }

      //再発注ボタン押下時
      else if(reOrderConfirm_STATE && postBackData.product.orderState == 1){
        console.log(`--1 再発注、または重複発注`)
        ///発注情報作成
        cartInfoArray_OrderPattern.push(1)

        //希望納品日
        const desiredDeliveryday = timeMethod.getDateFmt(postBackData.product.deliveryday, "orderList_deliveryday")
        textProdcut += "希望納品日: " + desiredDeliveryday + "\n\n"

        //新規発注情報配列（スプレッドシート格納用）
        const orderArray = orderRecords.getOrderArray(postBackData_timeStamp, postBackData, productInfoArray, desiredDeliveryday)
        //console.log(`orderArray: ${orderArray}`)      
        orderArrays.push(orderArray)

        //在庫修正
        const newStock = await plSheets[postBackData.product.sheetId].plSheet.getNewStock(postBackData.product.productId, postBackData.product.orderNum)
        plSheets[postBackData.product.sheetId].order.push({pId: postBackData.product.productId, productName: postBackData.product.name, newStock: newStock})        

        //発注件数を追加
        textProdcutsOrderConfirm += textProdcut
      }

      //新規発注ボタン押下時
      else{
        //発注情報 未確認
        if(postBackData.product.orderState == 0){
          if(checkSameProductsInCart(i ,user, postBackData)){
            console.log(`--2 新規発注、かつ買い物かご内に同一納品日・同一商品がある`)              
            cartInfoArray_OrderPattern.push(2)
            cartInfoArray_doubleCart.push(textProdcut)
          }
          else if(orderRecords.recordNum > 0 && await orderRecords.checkNewOrderisOrdered(productInfoArray, postBackData.product.deliveryday)){
            console.log(`--3 新規発注、かつ発注履歴有、かつ同一納品日・同一商品の発注履歴あり`)
            cartInfoArray_OrderPattern.push(3)
            cartInfoArray_doubleOrder.push(textProdcut)
          }
          else{
            console.log(`--4 新規発注、かつ買い物かごダブりなし、かつ（発注履歴なし、または同一納品日・同一商品の発注履歴なし）`)
            ///発注情報作成
            cartInfoArray_OrderPattern.push(4)
            
            //希望納品日
            const desiredDeliveryday = timeMethod.getDateFmt(postBackData.product.deliveryday, "orderList_deliveryday")    
            textProdcut += "希望納品日: " + desiredDeliveryday + "\n\n"

            //新規発注情報配列（スプレッドシート格納用）
            const orderArray = orderRecords.getOrderArray(postBackData_timeStamp, postBackData, productInfoArray, desiredDeliveryday)
            orderArrays.push(orderArray)

            //在庫修正
            const newStock = await plSheets[postBackData.product.sheetId].plSheet.getNewStock(postBackData.product.productId, postBackData.product.orderNum)
            plSheets[postBackData.product.sheetId].order.push({pId: postBackData.product.productId, productName: postBackData.product.name, newStock: newStock})

            //発注件数を追加
            textProdcutsOrderConfirm += textProdcut
          }
        }
        //発注情報 確認済み
        else{
          //再伺い
          console.log(`--5 新規発注、かつ再発注フラグ 十中八九確定ボタン2度押し`)
          cartInfoArray_OrderPattern.push(5)
          cartInfoArray_doubleOrder.push(textProdcut)
        }
      }
    }
    console.log(`--買い物かご情報 仕分け完了\n`)

    //●買い物かご情報 更新
    for(let k in cartInfoArray_OrderPattern){
      //--0 発注不可商品  何もしない

      //--1 再発注、または重複発注
      //--4 新規発注、かつ買い物かごダブりなし、かつ（発注履歴なし、または同一納品日・同一商品の発注履歴なし
      if(cartInfoArray_OrderPattern[k] == 1 || cartInfoArray_OrderPattern[k] == 4){
        //買い物かごから削除
        delete user.property.CART[k]
        console.log(`${k} 買い物かごから削除`)
      }
      //
      //--2 新規発注、かつ買い物かご内に同一納品日・同一商品がある
      //--3 新規発注、かつ発注履歴有、かつ同一納品日・同一商品の発注履歴あり
      //--5 新規発注、かつ再発注フラグ 十中八九確定ボタン2度押し
      else if(cartInfoArray_OrderPattern[k] == 2 || cartInfoArray_OrderPattern[k] == 3 || cartInfoArray_OrderPattern[k] == 5){
        user.property.CART[k].orderState = 1
        console.log(`${k} 再伺いフラグ`)
      }
    } 
    const ORDER_NUM = orderArrays.length
    await user.property.CART.sort() //並び替えて空要素を後ろに
    await user.property.CART.splice(user.property.CART.length - ORDER_NUM, ORDER_NUM) //空要素を削除
    await user.updateDB()
    console.log(`--買い物かご情報 更新完了`)

    //●メッセージ作成/送信
    let textMessage = ""

    //発注可能商品あり
    if(ORDER_NUM > 0){
      textMessage = textProdcutsOrderConfirm +
      "\n\n以上" + ORDER_NUM + "件の発注が完了しました。\n" +
      "またのご利用をお待ちしております。"
    }

    //再伺いあり、かつ買い物かご情報がある（保険）
    const reOrderState = (cartInfoArray_doubleOrder.length > 0 || cartInfoArray_doubleCart.length > 0)
    //console.log(`reOrderState: ${reOrderState}`)
    if(reOrderState && user.property.CART.length > 0){
      //STATE_NEWORDER 追加発注確認: false
      //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0    
      messagesArray = await module.exports.getCarouselMessage(user, postBackData_timeStamp, false, 0)
      
      if(textMessage != ""){
        textMessage += `\n\n${getReOrderTextMessage(cartInfoArray_doubleOrder, cartInfoArray_doubleCart)}`
      }
      else{
        textMessage = getReOrderTextMessage(cartInfoArray_doubleOrder, cartInfoArray_doubleCart)
      }
    }

    //テキストメッセージ
    //条件: テキストメッセージが空欄でない
    if(textMessage != ""){
      //console.log(textMessage)
      messagesArray.push(message_JSON.getTextMessage(textMessage));
    }

    //スタンプメッセージ
    //条件: 新規発注あり、かつ再発注伺いなし
    if(ORDER_NUM > 0 && !reOrderState){
      messagesArray.push(new StampMessage().ありがとう);
    }    
    
    return [messagesArray, orderArrays, plSheets]
  })
}