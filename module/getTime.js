/* eslint-disable one-var */
//以下のjsファイルにて、日本時刻を引数にすること
//class OrdersList.js
//Order.js
//OneOrder.js
//Cart.js

const property = require("./property.js");
const { utcToZonedTime, format } = require('date-fns-tz')
require("date-utils");

module.exports.TIMEZONE = "Asia/Tokyo"
const dateFmt = {
  LINE_SYS: "yyyy-MM-dd", //LINEシステム用 
  orderList_deliveryday: "yy/MM/dd", 
  orderList_orderDay: "yyyy/MM/dd HH:mm:ss"//スプレッドシート 発注リスト 発注日時用 //時間HH: 0~24, hh: 0~12
}

//曜日取得  From Date To DAYOFWEEK
const getDayOfWeek = (date) => {
  const dayofweek = date.getDay()
  const arrayDay = ['日', '月', '火', '水', '木', '金', '土']
  return arrayDay[dayofweek]
}

module.exports.getDateFmt = (unixTime, FMT) => {
  const date = utcToZonedTime(new Date(unixTime), module.exports.TIMEZONE)
  
  let conversionDate
  if(FMT == "orderList_deliveryday"){
    //From unixTime or YYYY-MM-DD  To ’yy/MM/dd(DAYOFWEEK)
    conversionDate = format(date, dateFmt[FMT], { timeZone: module.exports.TIMEZONE })    
    conversionDate = `’${conversionDate}(${getDayOfWeek(date)})`;        
  }
  else{
    //LINE_SYS From unixTime To YYYY-MM-DD
    //orderList_orderDay  From unitTime To yy/mm/dd hh:mm:ss
    conversionDate = format(date, dateFmt[FMT], { timeZone: module.exports.TIMEZONE })
  }
  //console.log(`DateFMT ${unixTime} → ${date} → ${conversionDate}`)
  return conversionDate
}

/*
const testgetDateFmt = () => {
  const time = "2023-03-24"
  module.exports.getDateFmt(time, "orderList_deliveryday")
  module.exports.getDateFmt(new Date(time).getTime(), "LINE_SYS")
  module.exports.getDateFmt(time, "orderList_orderDay")
}
testgetDateFmt()
*/

//●翌年日取得 From YYYY-MM-DD To YYYY
const getNextYMD = () => {
  const date = utcToZonedTime(new Date(), module.exports.TIMEZONE)
  const nextYeaer = date.getFullYear() + 1; //翌年
  return nextYeaer + date.slice(-6); //月日を足す
}

//●翌競り日取得
const getNextAuctionDay = (unixTime, id) => {
  const ONEDAY_UNIXTIME = 86400000 //1日＝86400000ms  //86400s
  const DAYOFWEEK = getDayOfWeek(utcToZonedTime(new Date(unixTime), module.exports.TIMEZONE))
  
  let AFTER_UNIXTTIME = unixTime  
  if(DAYOFWEEK == "火"){
    //翌競り日 曜日"水"
    AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME
  }
  else if (DAYOFWEEK == "木"){
    //翌競り日 曜日"金"
    AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME
  }
  else if (DAYOFWEEK == "土"){
    //翌競り日 曜日"月"
    AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME*2
  }
  else if (DAYOFWEEK == "日"){
    //翌競り日 曜日"月"
    AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME
  }

  if(id == 1){//競り日も翌競り日に
    if(DAYOFWEEK == "月"){
      //翌競り日 曜日"水"
      AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME*2
    }
    else if (DAYOFWEEK == "水"){
      //翌競り日 曜日"金"
      AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME*2
    }
    else if (DAYOFWEEK == "金"){
      //翌競り日 曜日"月"
      AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME*3
    }
  }
  return AFTER_UNIXTTIME
}

//●納品日 荷受け日、ブロック日チェック From unixTime To [yyyy-MM-DD, checkState]
module.exports.checkDeliveryday = (BEFORE_UNIXTTIME) =>{
  //荷受け日を競り日に
  const AFTER_UNIXTTIME = getNextAuctionDay(BEFORE_UNIXTTIME, 0)
  
  let CHANGE_STATE, CHANGE_STATE_TEXT
  if(AFTER_UNIXTTIME != BEFORE_UNIXTTIME){
    CHANGE_STATE = true, CHANGE_STATE_TEXT = "変更あり"
  }
  else{
    CHANGE_STATE = false, CHANGE_STATE_TEXT = "変更なし"
  }
  console.log(`--納品日 荷受け日、ブロック日チェック後 ${CHANGE_STATE_TEXT}: ${AFTER_UNIXTTIME}`) 
  return [AFTER_UNIXTTIME, CHANGE_STATE]
}

//●納品日 納品期間チェック
//From yyyy-MM-DD
//To text, changeState:true: , false: 
module.exports.checkdeliveryPeriod = (unix_D, masterProductArray) => {
  
  //納品開始日
  const unix_sD =  masterProductArray[property.constPL.columns.sDeliveryday]._seconds*1000

  //納品終了日
  const unix_eD =  masterProductArray[property.constPL.columns.eDeliveryday]._seconds*1000

  //判定
  let text, changeState = false
  if(unix_D < unix_sD  || unix_eD < unix_D){
    console.log(`--納品期間 外`)
    changeState = true

    //納品日書き換え
    text = "納品期間外のため、再指定してください。" 
    
    //納品日
    console.log("---納品開始日:" + utcToZonedTime(new Date(unix_sD), module.exports.TIMEZONE) + "  unix:" + unix_sD)
    console.log("---希望納品日:" + utcToZonedTime(new Date(unix_D), module.exports.TIMEZONE) + "  unix:" + unix_D)
    console.log("---納品終了日:" + utcToZonedTime(new Date(unix_eD), module.exports.TIMEZONE) + "  unix:" + unix_eD)
  }
  else{
    console.log(`--納品期間 内`)
    text = unix_D
  }
  return [text, changeState]
}

// ’yy/MM/dd(DAYOFWEEK)  LINE内表示用  買い物かご情報・発注情報 希望納品日用
//●SpreadSheet From ’yy/MM/dd(DAYOFWEEK) To YYYY-MM-DD
module.exports.getDeliverydayYMD = (DATE, id) => {
  DATE = module.exports.getDateFMSpreadSheetToLINE(DATE, "LINE")
  if(DATE === null){
    if(id == 0){
      return 
    }
    else if(id == 1){
      return getNextYMD()
    }
  }
  else{
    return DATE
  }
}

//●SpreadSheet From ’yy/MM/dd(DAYOFWEEK) TO state:date Date(), state:unix unixTime, state:LINE LINEFMT
module.exports.getDateFMSpreadSheetToLINE = (DATE, state) => {
  try{
    const [year, month, day] = getYMDFMSpreadSheet(DATE)
    const date = new Date(year, month - 1, day)
    console.log(`--希望納品日: ${DATE} >> ${date}`)    
    const unixTime = date.getTime()

    //日付判定
    if(isNaN(unixTime)){
      return null
    }
    else if(state == "date"){
      return date
    }
    else if(state == "unix"){
      return unixTime
    }
    else if(state == "LINE"){
      const dateForLINEFMT = `${year}-${month}-${day}`
      return dateForLINEFMT
    }
  }
  catch(e){
    return null
  }
}

//●SpreadSheet From ’yy/MM/dd(DAYOFWEEK)) To [year, month, date]
const getYMDFMSpreadSheet = (DATE) => {
  if(DATE == "" | DATE === null | DATE === undefined){return null}
  DATE = DATE.split("/") //[yy, MM, dd(DAYOFWEEK))]
  
  let year, month, day

  //年
  year = utcToZonedTime(new Date(), module.exports.TIMEZONE)//今年 
  year = year.getFullYear().toString()  //年 上二桁 100年前の日付を引数としていない前提
  year = year.slice(0, 2) + DATE[0].slice(1, 2)//年 上二桁 ⁺ 下二桁

  //月
  if(String(month).length == 1){
    month = "0" + DATE[1]
  }
  else{
    month = DATE[1]
  }
  
  //日
  day = DATE[2].split("(") //[dd, DAYOFWEEK))]
  day = day[0]
  if(String(day).length == 1){
    day = "0" + day
  }
  return [year, month, day]
}

//発注日時 From 'yy/MM/DD hh:mm:ss To Date()
module.exports.getDateFMOrderDay = (orderDay) => {
  let buff = orderDay.split(" ") // [yy/MM/DD, hh:mm:ss]
  buff[0] = buff[0].split("/") //[yy, MM, DD]

  let yyyy = utcToZonedTime(new Date(), module.exports.TIMEZONE)
  yyyy = yyyy.getFullYear().toString()
  yyyy = yyyy.slice(0, 2) + buff[0][0].replace("’", "") //年 上二桁 ⁺ 下二桁

  const MM = Number(buff[0][1]) - 1
  const dd  = buff[0][2]

  buff[1] = buff[1].split(":")
  const HH = Number(buff[1][0]) - 9
  const mm = buff[1][1]
  const ss = buff[1][2]
  
  const date = utcToZonedTime(new Date(yyyy, MM, dd, HH, mm, ss), module.exports.TIMEZONE)
  console.log(`--発注日時: ${orderDay} >> ${date}`)
  return date
}