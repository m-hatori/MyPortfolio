/* eslint-disable one-var */
const property = require("../property.js");
const timeMethod = require("../getTime.js");
const Products = require("../class ProductsList.js");

const message_JSON = require("./message_JSON.js");
const flexMessage_ForBuyer = require("./Flex Message Parts For Buyer.js");
const Order = require("./Order.js");
const StampMessage = require("./Class Stamp.js");


//●複数 発注内容確認（買い物かご情報表示）
//引数
//STATE_NEWORDER 新規発注確認: true、追加発注確認: false
//STATE_CHECK_DELIVERYDAY :0 納品日チェックしない、 1：荷受け日・ブロック日チェック、2：納品期間チェック

//TODO: 単品用と共通部分を共有したい
module.exports.getCarouselMessage = async function(user, TIMESTAMP, STATE_NEWORDER, STATE_CHECK_DELIVERYDAY){
  //●前処理
  //商品リスト情報
  let plSheets ={}, plSheet, sheetId = "", plSheetVals = "", pId = "", cartPNum, masterProductArray = null, picUrl, orderNum, deliveryday, SD_FMT_LINE, ED_FMT_LINE

  //メッセージ
  let messagesArray = []      
  let card, columns = []
  let buff, stateDeliveryday, STATE_PRODUCTINFO, changeStateDeliveryday = false, changeCart = false, textOrderNum = "", textDeliveryday = "", textDeliverydayState = [false, "商品No."]
  let bodyContents  = [], imageContents = [], footerContents = []
  let postBackData = {
    timeStamp: TIMESTAMP,
    tag: "cart",
    product: {}
  }

  //●メッセージ作成
  //買い物かご内 商品カード作成ループ
  console.log(`----買い物かご商品表示----` )
  for (let i in user.property.CART){
    postBackData.product = user.property.CART[i]
        
    //変数取得
    cartPNum = Number(i) + 1
    sheetId     = postBackData.product.sheetId
    orderNum    = postBackData.product.orderNum
    deliveryday = postBackData.product.deliveryday //yyyy-mm-dd
    imageContents = flexMessage_ForBuyer.getCardlabel(imageContents, "買い物かご商品No." + cartPNum + " 発注内容")  //上部ラベル
    
    //商品リストインスタンス、情報取得
    buff = plSheets[sheetId]
    if(buff !== undefined){
      plSheet     = buff.plSheet
      plSheetVals = buff.plSheet.plSheetVals
    }
    else{
      plSheet = new Products(user.SSIDS.spSheetId1, sheetId)
      await plSheet.getAllSheetData()
      plSheetVals = plSheet.plSheetVals
      plSheets[sheetId] = {"plSheet" : plSheet}
    }              

    //同一商品IDの商品情報を抽出
    pId = postBackData.product.productId
    console.log(``)
    console.log(`-買い物かごNo.${cartPNum} 商品リストID: ${sheetId} 商品No. : ${pId}`)
    
    masterProductArray = plSheetVals[pId - 1]._rawData
    //console.log(`masterProductArray : ${masterProductArray}`)
    if(masterProductArray == undefined){
      console.log(`商品マスタ情報に問題があります。`)
    }

    //商品情報確認
    STATE_PRODUCTINFO = Order.certificationProductInfo(postBackData, masterProductArray)
    const STOCKNOW = masterProductArray[property.constPL.columns.stockNow]
    if(STOCKNOW <= 0 || STATE_PRODUCTINFO){
      console.log(`--在庫なし。また商品情報不一致`)
      //●口数
      textOrderNum = "-"
      
      //●納品日
      textDeliveryday = "-"
      
      //body
      picUrl = "https://drive.google.com/uc?id=1O0Y4sc-vMYE7-5LPF0tbywHG7Owt0TKO" //完売画像

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
      textOrderNum = "希望口数：" + orderNum
      
      //●納品日
      SD_FMT_LINE = timeMethod.getDeliverydayYMD(masterProductArray[property.constPL.columns.sDeliveryday], 0)
      ED_FMT_LINE = timeMethod.getDeliverydayYMD(masterProductArray[property.constPL.columns.eDeliveryday], 1)
      
      const checkTextDeliveryday = Order.chechkTextDeliveryday(deliveryday)
      //console.log(`checkTextDeliveryday: ${checkTextDeliveryday}`)

      //納品日がテキスト
      if(checkTextDeliveryday[0]){
        textDeliveryday = "希望市場納品日：" + deliveryday

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
        textDeliveryday = "希望市場納品日：" + timeMethod.getDisplayFmtDate(deliveryday)
      }
      //納品日がテキストでなく、納品日チェックが必要
      else{
        //荷受け日、ブロック日確認
        if(STATE_CHECK_DELIVERYDAY == 1){
          //TODO: スキップ 荷受け日、ブロック日確認 納品終了日が荷受け日のとき、翌競り日にすると納品期間外になってしまう。。。
          stateDeliveryday = Order.certificationDeliveryday(checkTextDeliveryday[1])//[newDeliveryday, changeStateDeliveryday]
          changeStateDeliveryday = stateDeliveryday[1]

          //変わったらpostBackData書き換え
          if(changeStateDeliveryday){
            postBackData.product.deliveryday = stateDeliveryday[0]
            user.property.CART[i] = postBackData.product            

            //注意メッセージ 追記
            textDeliveryday = "希望市場納品日：" + timeMethod.getDisplayFmtDate(stateDeliveryday[0]) + "\n※翌競り日に変更しました"
            changeCart = true            
          }
          else{
            textDeliveryday = "希望市場納品日：" + timeMethod.getDisplayFmtDate(checkTextDeliveryday[1])
          }                   
        }

        //納品期間確認
        else if(STATE_CHECK_DELIVERYDAY == 2){
          stateDeliveryday = Order.certificationdeliveryPeriod(deliveryday, SD_FMT_LINE, ED_FMT_LINE)//[newDeliveryday, changeStateDeliveryday]
          changeStateDeliveryday = stateDeliveryday[1]

          //変わったらpostBackData書き換え
          if(changeStateDeliveryday){
            postBackData.product.deliveryday = stateDeliveryday[0]
            user.property.CART[i] = postBackData.product

            //注意メッセージ 追記
            textDeliveryday = "希望市場納品日：" + stateDeliveryday[0] //テキスト
            
            //納品期間外メッセージ
            textDeliverydayState[0] = true
            if(textDeliverydayState[1] == "商品No."){
              textDeliverydayState[1] += cartPNum
            }
            else{
              textDeliverydayState[1] += ", " + cartPNum
            }
            
            changeCart = true
          }
          else{
            textDeliveryday = "希望市場納品日：" + timeMethod.getDisplayFmtDate(checkTextDeliveryday[1])
          }                    
        }                
      }
      //body
      imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "残" + STOCKNOW + "口")  //残口
      picUrl = masterProductArray[property.constPL.columns.picUrl] //商品画像
            
      //footer 口数、納品日ボタンを表示
      let postBackData_selectOrderNum = postBackData
      postBackData_selectOrderNum.command = "selectOrderNum"
      footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWidth("口数", `買い物かご商品No.${cartPNum}の口数変更`, postBackData_selectOrderNum, "30%"))      

      let postBackData_setDeliveryday = postBackData
      postBackData_setDeliveryday.command = "setDeliveryday"
      footerContents.push(flexMessage_ForBuyer.getCardfooterDeliverydayBottun("納品日", postBackData_setDeliveryday, SD_FMT_LINE, ED_FMT_LINE))      
    }
    
    //body 共通
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(picUrl), imageContents))//商品情報１  画像、残口追加
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(postBackData, masterProductArray[property.constPL.columns.deliveryPeriod]))//商品情報2   商品名～市場納品期間
    bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo(textOrderNum, textDeliveryday))//発注情報

    //footer 共通
    let postBackData_delete = postBackData
    postBackData_delete.command = "delete"
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWidth("削除", "削除", postBackData, "30%"))

    card = flexMessage_ForBuyer.getProductCardForBuyer(bodyContents, footerContents)
    columns.push(card)
  
    //初期化
    sheetId = "", plSheetVals = "", pId = "", masterProductArray = null, stateDeliveryday = null, textOrderNum = "", textDeliveryday = "", changeStateDeliveryday = false
    bodyContents  = [], imageContents = [], footerContents = []
  }
  

  //●右端カード 発注確定ボタン、全削除
  //TODO: スキップ 再発注メッセージ、発注確定ボタンを表示しない条件決め
  //条件：口数、納品日がテキスト
  let textMessage = ""
  //発注確定 全削除ボタン
  const postBackData_allDelete = {
    timeStamp: TIMESTAMP,
    tag: "cart",
    command: "allDelete"
  }  
  if(textDeliverydayState[0]){
    //TODO: 発注確定ボタンを表示しない。
    textMessage += textDeliverydayState[1] + "は時間経過により納品期間外の日付が指定されています。\n希望納品日を再指定してください。"
    //const endCard = flexMessage_ForBuyer.getCardOrderCertification(explainText, "発注確定", postBackData_OrderConfirm, "買い物かご\nリセット", postBackData_allDelete)
    //columns.push(endCard)    
  }
  else{
    //新規発注のみ
    let postBackData_OrderConfirm = {
      timeStamp: TIMESTAMP,
      tag: "cart",    
    }
    if(STATE_NEWORDER){
      postBackData_OrderConfirm.command = "orderConfirm"
    }
    //再発注伺い
    else{
      postBackData_OrderConfirm.command = "reOrderConfirm"
    }
    
    //説明文
    let explainText = 
      "希望商品・口数・納品日を\nご確認ください。\n\n問題なければ下の\n「発注確定」ボタンを押してください。\n\n" +
      "「買い物かごリセット」ボタンを押すと、買い物かご内の商品がすべて削除できます。"
    const endCard = flexMessage_ForBuyer.getCardOrderCertification(explainText, "発注確定", postBackData_OrderConfirm, "買い物かご\nリセット", postBackData_allDelete)
    columns.push(endCard)
  }

  //メッセージ格納
  messagesArray.push(message_JSON.getflexCarouselMessage("買い物かご内商品一覧", columns))
  if(textMessage != ""){messagesArray.push(message_JSON.getTextMessage(textMessage))}

  //●後処理
  //口数・納品日変更、再発注なら,スプレッドシートの買い物かご情報書き換え
  if(changeCart){user.update_CartInfo()}        

  return messagesArray
}

//●発注確定
//reOrderConfirm_STATE true：再発注, false：新規発注
module.exports.orderConfirm = async function(user, TIMESTAMP, orderRecords, reOrderConfirm_STATE){
  //●前処理
  //変数定義
  let orderArrays = [], orderArray = [], messagesArray = []

  //買い物かご情報取得
  let postBackData = {}, orderNum, deliveryday
  let reOrderState = false //1件でも再発注伺いが入ったらtrue

  //商品リスト情報
  let plSheets ={}, plSheet, sheetId = "", plSheetVals = "", pId = "", masterProductArray = null, upState = false, stockNow = 0
  let STATE_PRODUCTINFO

  //発注情報 仕分け
  let textProdcutsOrderConfirm = "", cartInfoArray_doubleOrder = [], cartInfoArray_doubleCart = []
  await (async () => {
      for (let i in user.property.CART){
        console.log(`買い物かご配列: ${i}`)
        //買い物かご 1商品情報posaBackData 抽出
        postBackData.product = user.property.CART[i]
        sheetId      = postBackData.product.sheetId
        pId          = Number(postBackData.product.productId)
        orderNum     = postBackData.product.orderNum
        deliveryday  = postBackData.product.deliveryday//yyyy-mm-dd
        
        //posaBackDataからスプレッドシートの情報を取得
        //商品リストインスタンス、情報取得
        let buff = plSheets[sheetId]
        if(buff !== undefined){
          plSheet     = buff.plSheet
          plSheetVals = buff.plSheet.plSheetVals
        }
        else{
          plSheet = new Products(user.SSIDS.spSheetId1, sheetId)
          await plSheet.getAllSheetData()            
          plSheetVals = plSheet.plSheetVals
          plSheets[sheetId] = {"plSheet" : plSheet}
        }

        //同一商品IDの商品情報を抽出
        masterProductArray = plSheetVals[pId - 1]._rawData
        //console.log(`masterProductArray : ${masterProductArray}`)
        //TODO: スキップ スプレッドシートの情報を取得できなかったときの対処
        if(masterProductArray == undefined){
          console.log(`商品マスタ情報に問題があります。`)
          console.log(`シートID : ${sheetId} 商品ID : ${pId}  商品マスタ情報：${masterProductArray}`)
        }
        stockNow = masterProductArray[property.constPL.columns.stockNow]
        upState = masterProductArray[property.constPL.columns.upState]

        //商品情報確認
        STATE_PRODUCTINFO = Order.certificationProductInfo(postBackData, masterProductArray)

        //口数確認 不要
        //納品日確認 不要 発注内容確認時に確認しているのと、受注締切後はブロックするから。
        //ただし、発注確定後の納品日はチェックせずに許容する。
            
        //新規発注データ準備
        //新規発注情報配列（スプレッドシート格納用）
        orderArray = orderRecords.getOrderArray(TIMESTAMP, sheetId, masterProductArray, orderNum, deliveryday)
        //console.log(orderArray)

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
          //再発注伺い時処置 postBackData.product.orderState = 1
        
        await (async function(){
          let textProdcut = "●" + postBackData.product.name + "\n" +
          postBackData.product.norm + "\n" +
          "希望口数: " + orderNum + "\n" +
          "希望納品日: " + timeMethod.getDisplayFmtDate(deliveryday) + "\n\n"

          if(!upState || stockNow <= 0 || STATE_PRODUCTINFO || Order.chechkTextDeliveryday(deliveryday)[0]){
            console.log(`--0 発注不可商品`) //そのまま買い物かご内に残しておく            
          }
          //再発注ボタン押下時
          else if(reOrderConfirm_STATE && postBackData.product.orderState == 1){
            console.log(`--1 再発注、または重複発注`)

            ///発注情報作成
            orderArrays.push(orderArray)

            //在庫修正
            plSheets[sheetId].plSheet.setNewStock(pId, stockNow, orderNum)      

            //買い物かごから削除
            user.property.CART.splice(i, 1)

            //発注件数を追加
            textProdcutsOrderConfirm += textProdcut
          }

          //新規発注ボタン押下時
          else{
            //発注情報 未確認
            if(postBackData.product.orderState == 0){
              if(certificationCartInfo(user, postBackData)){
                console.log(`--2 新規発注、かつ買い物かご内に同一納品日・同一商品がある`)
                cartInfoArray_doubleCart.push(textProdcut)
                
                //再発注フラグ
                postBackData.product.orderState = 1
                user.property.CART[i] = postBackData.product
                reOrderState = true
              }
              else if(orderRecords.recordNum > 0 && orderRecords.certificateOrderRecord(masterProductArray, deliveryday, false)){
                console.log(`--3 新規発注、かつ発注履歴有、かつ同一納品日・同一商品の発注履歴あり`)
                cartInfoArray_doubleOrder.push(textProdcut)
                
                //再発注フラグ
                postBackData.product.orderState = 1
                user.property.CART[i] = postBackData.product
                reOrderState = true
              }
              else{
                console.log(`--4 新規発注、かつ買い物かごダブりなし、かつ（発注履歴なし、または同一納品日・同一商品の発注履歴なし）`)
                ///発注情報作成
                orderArrays.push(orderArray)

                //在庫修正
                plSheets[sheetId].plSheet.setNewStock(pId, stockNow, orderNum)

                //買い物かごから削除
                user.property.CART.splice(i, 1)    

                //発注件数を追加
                textProdcutsOrderConfirm += textProdcut
              }
            }
            //発注情報 確認済み
            else{
              //再伺い
              console.log(`--5 新規発注、かつ再発注フラグ 十中八九確定ボタン2度押し`)
              //const POSTCODEARRAY = postBackData.product.postbackCode].split("-")
              cartInfoArray_doubleOrder.push("●No." + (Number(i) + 1) + "\n" + textProdcut)   

              //再発注フラグ
              postBackData.product.orderState = 1
              user.property.CART[i] = postBackData.product
              reOrderState = true
            }
          }
        })

        //初期化
        pId = "", masterProductArray = null, upState = false, stockNow = 0, orderArray = null
      }
  })
  
  //買い物かご情報の更新
  user.update_CartInfo()

  //リッチメニュー設定
  user.setRichMenu()
  //console.log(JSON.stringify(orderArrays))

  //●メッセージ作成/送信
  let textMessage = ""

  //発注可能商品あり
  await (async () => {
    if(orderArrays.length > 0){
      //発注履歴挿入
      orderRecords.insertOrderRecord(orderArrays);

      //在庫更新 スプレッドシートに反映
      //TODO: １つずつ保存してる
      for(let buff of orderRecords.allSheetIdsArray){
        if(plSheets[buff] !== undefined){
          plSheets[buff].plSheet.sheet.saveUpdatedCells(); // save all updates in one call
        }
      }

      textMessage = `以下${orderArrays.length}件の発注が完了しました。\n\n
        
        ${textProdcutsOrderConfirm}\n\n

        またのご利用をお待ちしております。`
    }
  })

  //再伺いあり、かつ買い物かご情報がある（保険）
  if(reOrderState && user.property.CART.length > 0){
    //STATE_NEWORDER 追加発注確認: false
    //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0    
    messagesArray = await module.exports.getCarouselMessage(user, TIMESTAMP, false, 0)
    textMessage = getReOrderTextMessage(textMessage, cartInfoArray_doubleOrder, cartInfoArray_doubleCart)
  }

  //テキストメッセージが空欄でない
  if(textMessage != ""){
    messagesArray.push(message_JSON.getTextMessage(textMessage));    
  }

  //新規発注あり、かつ再発注伺いなし
  if(orderArrays.length > 0 && !reOrderState){
    messagesArray.push(new StampMessage().ありがとう);
  }
  
  return messagesArray
}

//買い物かご内に同一商品が複数あるかチェック
function certificationCartInfo(user, postBackData){
  //new Promise(() => {
    for (let buff of user.property.CART){
      if(
        buff.product.producer == postBackData.product.producer &&
        buff.product.name == postBackData.product.name &&
        buff.product.norm == postBackData.product.norm &&
        buff.product.deliveryday == postBackData.product.deliveryday
      ){
        console.log(`---二重発注`)
        return true
      }
    }
  //}).then(() => {
    console.log(`---二重発注でない`)
    return false
  //})
}

//再伺いメッセージ取得
//TODO: スキップ 再発注伺いと 納品日がテキストのとき 再発注メッセージ、発注確定ボタンを表示しない。のとどう影響するか
function getReOrderTextMessage(textMessage, cartInfoArray_doubleOrder, cartInfoArray_doubleCart){
  //発注履歴にダブり
  let buff
  if(cartInfoArray_doubleOrder.length != 0){
    textMessage += "以下の商品は、同納品日に発注済みです。\n";
    for(buff of cartInfoArray_doubleOrder){
      //納品日：商品名
      textMessage += buff + "\n\n";
    }
  }

  //買い物かご内にダブり
  if(cartInfoArray_doubleCart.length != 0){
    //納品日：商品名
    if(textMessage != ""){textMessage += "\n\n"}
    textMessage += "以下の商品は、同一商品を同納品日に重複発注しようとしています。\n";
    for(buff of cartInfoArray_doubleCart){
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