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
  //商品数確認
  let messagesArray = []
  
  //変数定義
  //買い物かご情報取得
  let cartInfoArray = user.property.CART
  let postBackData, cartPNum, orderNum, deliveryday

  //商品リスト情報
  let plSheets ={}, plSheet, sheetId = "", plSheetVals = "", pId = "", masterProductArray = null, SD_FMT_LINE, ED_FMT_LINE
        
  //●メッセージ作成
  //カード作成ループ
  console.log(`----買い物かご商品表示----` )
  let columns = [] //カルーセルメッセージ配列
  let card, buff, stateDeliveryday, STATE_PRODUCTINFO, changeStateDeliveryday = false, changeCart = false, textOrderNum = "", textDeliveryday = "", textDeliverydayState = [false, "商品No."]
  for (let i in cartInfoArray){
    postBackData = cartInfoArray[i]
    
    //カード作成条件  とりあえず全部カードは作っちゃう
    //新規発注確認 STATE_NEWORDER:0, CHECK_ORDER_STATE:0
    //追加発注確認？ state0を通ってきたものは、reOrderをリセットしているのでありあえないはず。 STATE_NEWORDER:0, CHECK_ORDER_STATE:1
    //発注不可商品判定で、追加発注確認にまわされたやつ。 発注にはいかないで削除するまで表示され続ける。 STATE_NEWORDER:1, CHECK_ORDER_STATE:0
    //追加発注確認 STATE_NEWORDER:1, CHECK_ORDER_STATE:1
    //console.log(postBackData.product.name])
    
    //変数取得
    cartPNum = Number(i) + 1
    sheetId     = postBackData.product.sheetId
    orderNum    = postBackData.product.orderNum
    deliveryday = postBackData.product.deliveryday //yyyy-mm-dd    
    
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
    console.log(`pId : ${pId}`)
    
    masterProductArray = plSheetVals[pId - 1]._rawData
    //console.log(`masterProductArray : ${masterProductArray}`)
    if(masterProductArray == undefined){
      console.log(`商品マスタ情報に問題があります。`)
      console.log(`シートID : ${sheetId} 商品ID : ${pId}  商品マスタ情報：${masterProductArray}`)          
    }

    //商品情報確認
    STATE_PRODUCTINFO = Order.certificationProductInfo(postBackData, masterProductArray)
    if(STATE_PRODUCTINFO){textOrderNum = "-", textDeliveryday = "-"}
    else{
      //●口数テキストチェック 不要 getProductCardInCart()で後ほどやる
      textOrderNum = "希望口数：" + orderNum
      
      //●納品日テキストチェック
      SD_FMT_LINE = timeMethod.getDeliverydayYMD(masterProductArray[property.constPL.columns.sDeliveryday], 0)
      ED_FMT_LINE = timeMethod.getDeliverydayYMD(masterProductArray[property.constPL.columns.eDeliveryday], 1)
      
      const checkTextDeliveryday = Order.chechkTextDeliveryday(deliveryday)
      console.log(`checkTextDeliveryday: ${checkTextDeliveryday}`)

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
            user.property.CART[i] = postBackData            

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
            user.property.CART[i] = postBackData

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
    }

    //カルーセルメッセージの各カード作成
    //いずれにしても買い物かごに商品があるときはカードを作成する
    /*
    console.log(`cartPNum: ${cartPNum}`)
    console.log(`STATE_PRODUCTINFO: ${STATE_PRODUCTINFO}`)
    console.log(`SD_FMT_LINE: ${SD_FMT_LINE}`)
    console.log(`ED_FMT_LINE: ${ED_FMT_LINE}`)
    console.log(`textOrderNum: ${textOrderNum}`)
    console.log(`textDeliveryday: ${textDeliveryday}`)
    */
    
    card = getProductCardInCart(postBackData, masterProductArray, SD_FMT_LINE, ED_FMT_LINE, textOrderNum, textDeliveryday, cartPNum, STATE_PRODUCTINFO)
    
    //columnsに情報を格納する
    columns.push(card)
  
    //初期化
    sheetId = "", plSheetVals = "", pId = "", masterProductArray = null, stateDeliveryday = null, textOrderNum = "", textDeliveryday = "", changeStateDeliveryday = false
  }

  //口数・納品日変更、再発注なら,スプレッドシートの買い物かご情報書き換え
  if(changeCart){user.update_CartInfo()}        
  
  //再発注メッセージ、発注確定ボタンを表示しない。
  //TODO: スキップ 再発注メッセージ、発注確定ボタンを表示しない条件決め
  //条件：口数、納品日がテキスト
  let textMessage = ""
  if(textDeliverydayState[0]){
    textMessage += textDeliverydayState[1] + "は時間経過により納品期間外の日付が指定されています。\n希望納品日を再指定してください。"
  }
  else{
    //発注確定 全削除ボタン
    const postdata2 = {
      timeStamp: TIMESTAMP,
      tag: "cart",
      command: "allDelete"
    }
    //let label3 = "一括納品日\n変更", postdata3 = postCode_JSON.postBackTag.cart + "-" + postCode_JSON.postBackNum.cart.setAllDeliveryday + "--" + TIMESTAMP

    //新規発注のみ
    let postdata1
    if(STATE_NEWORDER){
      postdata1 = {
        timeStamp: TIMESTAMP,
        tag: "cart",
        command: "orderConfirm"
      }
    }
    //再発注伺い
    else{
      postdata1 = {
        timeStamp: TIMESTAMP,
        tag: "cart",
        command: "reOrderConfirm"
      }
    }

    //発注確定ボタン
    let explainText = 
      "希望商品・口数・納品日を\nご確認ください。\n\n問題なければ下の\n「発注確定」ボタンを押してください。\n\n" +
      "「買い物かごリセット」ボタンを押すと、買い物かご内の商品がすべて削除できます。"

    columns.push(flexMessage_ForBuyer.getCardOrderCertification(explainText, "発注確定", postdata1, "買い物かご\nリセット", postdata2))   
  }

  //メッセージ格納
  messagesArray.push(message_JSON.getflexCarouselMessage("買い物かご内商品一覧", columns))
  if(textMessage != ""){messagesArray.push(message_JSON.getTextMessage(textMessage))}
  return messagesArray
}

//●発注確定
//reOrderConfirm_STATE true：再発注, false：新規発注
module.exports.orderConfirm = async function(user, TIMESTAMP, orderRecords, reOrderConfirm_STATE){
  //●前処理
  //変数定義
  let orderArrays = [], orderArray = [], messagesArray = []

  //買い物かご情報取得
  const cartInfoArray = user.property.CART
  let postBackData, postBackDataArray, orderNum, deliveryday, CHECK_ORDER_STATE, reOrderState = false

  //商品リスト情報
  let plSheets ={}, plSheet, sheetId = "", plSheetVals = "", pId = "", masterProductArray = null, upState = false, stockNow = 0
  let STATE_PRODUCTINFO

  //発注情報
  let textProdcutsOrderConfirm = "", cartInfoArray_doubleOrder = [], cartInfoArray_doubleCart = []
  new Promise()(async () => {
    for (let i in cartInfoArray){
      //買い物かご 1商品情報posaBackData 抽出
      postBackData = cartInfoArray[i]
      postBackDataArray = postBackData.split("∫")
      sheetId      = postBackData.product.sheetId
      pId          = Number(postBackData.product.productId)
      CHECK_ORDER_STATE = postBackData.product.orderState
      orderNum     = postBackData.product.orderNum
      deliveryday  = postBackData.product.deliveryday//yyyy-mm-dd
        
      console.log(postBackData.product.name)
      
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
      STATE_PRODUCTINFO = Order.certificationProductInfo(postBackDataArray, masterProductArray)
    

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
        //再発注伺い時処置 CHECK_ORDER_STATE = 1
      
      if(!upState || stockNow <= 0 || STATE_PRODUCTINFO || Order.chechkTextDeliveryday(deliveryday)[0]){
        console.log(`0 発注不可商品`)
      }
      //再発注ボタン押下時
      else if(reOrderConfirm_STATE && CHECK_ORDER_STATE == 1){
        console.log(`1 再発注、または重複発注`)

        ///発注情報作成
        orderArrays.push(orderArray)

        //在庫修正
        plSheets[sheetId].plSheet.setNewStock(pId, stockNow, orderNum)      

        //買い物かごから削除
        user.property.CART.splice(i, 1)

        //発注件数を追加
        textProdcutsOrderConfirm += 
          "●" + postBackData.product.name + postBackData.product.norm +
          "\n希望口数:" + orderNum + "\n希望納品日:" + timeMethod.getDisplayFmtDate(new Date(deliveryday))
      }

      //新規発注ボタン押下時
      else{
        //発注情報 未確認
        if(CHECK_ORDER_STATE == 0){
          if(certificationCartInfo(cartInfoArray, postBackData)){
            console.log(`2 新規発注、かつ買い物かご内に同一納品日・同一商品がある`)
            cartInfoArray_doubleCart.push(
              "●" + postBackData.product.name + postBackData.product.norm +
              "\n希望納品日:" + timeMethod.getDisplayFmtDate(new Date(deliveryday))
              )
            
            //再発注フラグ
            let reOrderPostData = postBackData.replace("0∫on", "1∫on")
            user.property.CART[i] = reOrderPostData
            reOrderState = true
          }
          else if(orderRecords.recordNum > 0 && orderRecords.certificateOrderRecord(masterProductArray, deliveryday, false)){
            console.log(`3 新規発注、かつ発注履歴有、かつ同一納品日・同一商品の発注履歴あり`)
            cartInfoArray_doubleOrder.push(
              "●" + postBackData.product.name + postBackData.product.norm +
              "\n希望納品日:" + timeMethod.getDisplayFmtDate(new Date(deliveryday))
            )   
            
            //再発注フラグ
            postBackData.product.orderState = 1
            user.property.CART[i] = postBackData
            reOrderState = true
          }
          else{
            console.log(`4 新規発注、かつ買い物かごダブりなし、かつ（発注履歴なし、または同一納品日・同一商品の発注履歴なし）`)
            ///発注情報作成
            orderArrays.push(orderArray)

            //在庫修正
            plSheets[sheetId].plSheet.setNewStock(pId, stockNow, orderNum)

            //買い物かごから削除
            user.property.CART.splice(i, 1)    

            //発注件数を追加
            textProdcutsOrderConfirm += 
              "●" + postBackData.product.name + postBackData.product.norm +
              "\n希望口数:" + orderNum + "\n希望納品日:" + timeMethod.getDisplayFmtDate(new Date(deliveryday))
          }
        }
        //発注情報 確認済み
        else{
          //再伺い
          console.log(`4 新規発注、かつ再発注フラグ 十中八九確定ボタン2度押し`)
          //const POSTCODEARRAY = postBackData.product.postbackCode].split("-")
          cartInfoArray_doubleOrder.push(
            "●No." + (Number(i) + 1) + "\n" +
            postBackData.product.name + postBackData.product.norm +
            "\n希望納品日:" + timeMethod.getDisplayFmtDate(new Date(deliveryday))
          )   

          //再発注フラグ
          postBackData.product.orderState = 1
          user.property.CART[i] = postBackData
          reOrderState = true
        }
      }

      //初期化
      pId = "", masterProductArray = null, upState = false, stockNow = 0, orderArray = null
    }
  }).then(async ()=>{
    //●メッセージ作成/送信
    let textMessage = ""
    //発注可能商品あり
    const orderProductsNum = orderArrays.length
    if(orderProductsNum > 0){
      //発注履歴挿入
      orderRecords.insertOrderRecord(orderArrays);
      
      //商品番号書き換え
      //商品番号を使用しないようにする
      console.log(`発注前 買い物かご内商品数：${cartInfoArray.length}  発注後買い物かご：${cartInfoArray}`)
      console.log(`発注後 買い物かご内商品数：${user.property.CART.length}  発注後買い物かご：${user.property.CART}`)

      //在庫更新 スプレッドシートに反映
      //TODO: １つずつ保存してる
      for(let buff of orderRecords.allSheetIdsArray){
        if(plSheets[buff] !== undefined){
          plSheets[buff].plSheet.sheet.saveUpdatedCells(); // save all updates in one call
        }
      }

      textMessage = "以下" + orderProductsNum + "件の発注が完了しました。\n\n" 
      //+ "※「発注確定」後のキャンセル・変更については、直接市場へお問い合わせくださいませ。"
      textMessage += textProdcutsOrderConfirm
      textMessage += "またのご利用をお待ちしております。"
    }

    //再伺いあり、かつ買い物かご情報がある（保険）
    if(reOrderState && user.property.CART.length > 0){
      messagesArray = await getReOrderMessage(textMessage, user, TIMESTAMP, cartInfoArray_doubleOrder, cartInfoArray_doubleCart)
    }
    //再伺いなし かつテキストメッセージが空欄でない
    else if(textMessage != ""){
      messagesArray.push(message_JSON.getTextMessage(textMessage));
      messagesArray.push(new StampMessage().ありがとう);
    }  

    //買い物かご情報の更新
    user.update_CartInfo()

    //リッチメニュー設定
    user.setRichMenu()

    return messagesArray
  })
}

//買い物かご内に同一商品が複数あるかチェック
function certificationCartInfo(cartInfoArray, postBackData){
  new Promise(() => {
    for (let buff of cartInfoArray){
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
  }).then(() => {
    console.log(`---二重発注でない`)
    return false
  })
}

//●複数発注 商品カルーセルメッセージ(Flex Message)
function getProductCardInCart(postBackData, masterProductArray, SD_FMT_LINE, ED_FMT_LINE, textOrderNum, textDeliveryday, cartPNum, STATE_PRODUCTINFO){
  //body
  let bodyContents  = [], imageContents = [], footerContents = []
  imageContents = flexMessage_ForBuyer.getCardlabel(imageContents, "買い物かご商品No." + cartPNum + " 発注内容")  //上部ラベル

  //footer 残口あるときのみ、口数、納品日ボタンを表示
  if(masterProductArray[property.constPL.columns.stockNow] <= 0 || STATE_PRODUCTINFO) {
    console.log(`---在庫なし。また商品情報不一致`)
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

    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL("https://drive.google.com/uc?id=1O0Y4sc-vMYE7-5LPF0tbywHG7Owt0TKO"), imageContents))//商品情報１  画像、残口追加
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(postBackData, masterProductArray[property.constPL.columns.deliveryPeriod]))//商品情報2   商品名～市場納品期間
    bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo("-", "-"))//発注情報
  }
  else{
    console.log(`---在庫あり、かつ商品情報一致`)
    imageContents = flexMessage_ForBuyer.getCardbodyStockNow(imageContents, "残" + masterProductArray[property.constPL.columns.stockNow] + "口")  //残口

    let postBackData_selectOrderNum = postBackData
    postBackData_selectOrderNum.command = "selectOrderNum"
    footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWidth("口数", `買い物かご商品No.${cartPNum}の口数変更`, postBackData_selectOrderNum, "30%"))
    
    let postBackData_setDeliveryday = postBackData
    postBackData_setDeliveryday.command = "setDeliveryday"
    footerContents.push(flexMessage_ForBuyer.getCardfooterDeliverydayBottun("納品日", postBackData_setDeliveryday, SD_FMT_LINE, ED_FMT_LINE))

    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo1(flexMessage_ForBuyer.getCardPicURL(masterProductArray[property.constPL.columns.picUrl]), imageContents))//商品情報１  画像、残口追加
    bodyContents.push(flexMessage_ForBuyer.getCardbodyProductInfo2(postBackData, masterProductArray[property.constPL.columns.deliveryPeriod]))//商品情報2   商品名～市場納品期間
    bodyContents.push(flexMessage_ForBuyer.getCardbodyOrdderInfo(textOrderNum, textDeliveryday))//発注情報    
  }
  
  let postBackData_delete = postBackData
  postBackData_delete.command = "delete"  
  footerContents.push(flexMessage_ForBuyer.getCardfooterBottunWidth("削除", "削除", postBackData, "30%"))
          
  return  flexMessage_ForBuyer.getProductCardForBuyer(bodyContents, footerContents)
}

//再伺いメッセージ取得
//TODO: スキップ 再発注伺いと 納品日がテキストのとき 再発注メッセージ、発注確定ボタンを表示しない。のとどう影響するか
async function getReOrderMessage(textMessage, user, TIMESTAMP, cartInfoArray_doubleOrder, cartInfoArray_doubleCart){
  //STATE_NEWORDER 追加発注確認: false
  //STATE_CHECK_DELIVERYDAY 納品日チェック不要:0
  let messagesArray = await module.exports.getCarouselMessage(user, TIMESTAMP, false, 0)
  
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

  if(textMessage != ""){
    messagesArray.push(message_JSON.getTextMessage(textMessage))
  }

  return messagesArray
}