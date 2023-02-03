/* eslint-disable one-var */
//以下のjsファイルにて、日本時刻を引数にすること
//class sheet OrdersList
//buyer Order Method
//buyer Cart Message
//buyer One order Message

require("date-utils");

//●●●format●●●
//市場納品日 'yy/MM/dd(day) → yyyy-mm-dd
function getDeliverydayYMD(DATE, id){
  DATE = getDateFMSpreadSheetToLINE(DATE, "LINE")
  if(DATE === null){
    if(id == 0){
      return getFmtDateForLINE(new Date())//保険
    }
    else if(id == 1){
      return getNextYMD(getFmtDateForLINE(new Date()))
    }
  }
  else{
    return DATE
  }
}

//●SpreadSheetdateFmt(’yy/MM/dd(DAYOFWEEK)) to state:date Date(), state:unix unixTime, state:LINE LINEFMT
function getDateFMSpreadSheetToLINE(DATE, state){
  
  DATE = getYMDFMSpreadSheet(DATE)
  if(DATE === null){return null}

  //日付判定
  try{
    let newDate = new Date(DATE[0], DATE[1] - 1, DATE[2])
    let newDataUnix = newDate.getTime()

    if(isNaN(newDataUnix)){
      return null
    }
    else if(state == "date"){
      return newDate
    }
    else if(state == "unix"){
      return newDataUnix
    }
    else if(state == "LINE"){
      let dateForLINEFMT = DATE[0] + "-" + DATE[1] + "-" + DATE[2]
      return dateForLINEFMT
    }
  }
  catch(e){
    return null
  }
}

//●SpreadSheetdateFmt(’yy/MM/dd(DAYOFWEEK)) to [year, month, date]
function getYMDFMSpreadSheet(DATE){
  if(DATE == "" | DATE === null | DATE === undefined){return null}
  let syear, smonth, sdate
  DATE = DATE.split("/")

  //年
  syear = new Date().getFullYear().toString()
  syear = syear.substr(0, 2) + DATE[0].substr(1, 2)

  //月
  if(String(smonth).length == 1){
    smonth = "0" + DATE[1]
  }
  else{
    smonth = DATE[1]
  }
  
  //日
  sdate = DATE[2].split("(")
  sdate = sdate[0]
  if(String(sdate).length == 1){
    sdate = "0" + sdate
  }
  return [syear, smonth, sdate]
}

//●Date() to "yyyy-MM-dd"
//・LINEInput用、買い物かご用
//・SS記録用  買い物かご情報用、発注情報内希望納品日用
function getFmtDateForLINE(date){
  return date.toFormat("YYYY-MM-DD");
}

//●date
//From yyyy-mm-dd, yyyy/mm/dd,
//to ’yy/MM/dd(DAYOFWEEK)
//・LINE内表示用  買い物かご情報・発注情報 希望納品日用
//・買い物かご情報用（SS）、発注情報内希望納品日用（SS）はスプレッドシートの表示形式にて設定
function getDisplayFmtDate(date){
  let conversionDate = new Date(date).toFormat("YY/MM/DD");
  conversionDate += "(" + getDayOfWeek(date) + ")";//曜日追加
  return "’" + conversionDate
}

//曜日取得
//date to DAYOFWEEK
function getDayOfWeek(date){
  const dayofweek = new Date(date).getDay()
  const arrayDay = ['日', '月', '火', '水', '木', '金', '土']
  return arrayDay[dayofweek]
}

//発注日時 発注リスト用
function getOrderdayDisplayFmtDate(TIMESTAMP){
  const { utcToZonedTime, format } = require('date-fns-tz')
  const DATE = new Date(TIMESTAMP)
  //console.log(DATE)
  const TIMEZONE = 'Asia/Tokyo'
  const zonedDate = utcToZonedTime(DATE, TIMEZONE)
  const PATTERN = "yyyy/MM/dd HH:mm:ss" //時間HH: 0~24, hh: 0~12
  const FORMATTED_DATE = format(zonedDate, PATTERN, { timeZone: 'Asia/Tokyo' })
  //console.log(FORMATTED_DATE)
  return FORMATTED_DATE
}
/*
function getOrderdayDisplayFmtDate(TIMESTAMP){
  const DATE = new Date(TIMESTAMP + 32400000) //+9時間  firebaseやLINEの更新があった場合、不利 
  // → 今度
  return DATE.toFormat("YYYY/MM/DD HH24:MI:SS")
} 
*/

//納品日 発注リスト用
function getdeliverydayDisplayFmtDate(date){
  return new Date(date).toFormat("YYYY/MM/DD");
}    

//●翌年日取得   Lineインターフェースフォーマット
function getNextYMD(date){
  //date = yyyy-MM-dd
  let y = Number([date.substr(0, 4)]) + 1;
  let nextYMD = y + date.slice(-6);
  return nextYMD;
}

//●翌競り日取得
function getNextAuctionDay(unixTime, id){
  const ONEDAY_UNIXTIME = 86400000 //1日＝86400000ms  //86400s
  const DAYOFWEEK = getDayOfWeek(new Date(unixTime).toLocaleString({ timeZone: 'Asia/Tokyo' }))
  let AFTER_UNIXTTIME = unixTime
  
  if(DAYOFWEEK == "火"){
    //DAYOFWEEK = "水"
    AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME
  }
  else if (DAYOFWEEK == "木"){
    //DAYOFWEEK = "金"
    AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME
  }
  else if (DAYOFWEEK == "土"){
    //DAYOFWEEK = "月"
    AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME*2
  }
  else if (DAYOFWEEK == "日"){
    //DAYOFWEEK = "月"
    AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME
  }

  if(id == 1){//競り日も翌競り日に
    if(DAYOFWEEK == "月"){
      //DAYOFWEEK = "水"
      AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME*2
    }
    else if (DAYOFWEEK == "水"){
      //DAYOFWEEK = "金"
      AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME*2
    }
    else if (DAYOFWEEK == "金"){
      //DAYOFWEEK = "月"
      AFTER_UNIXTTIME = AFTER_UNIXTTIME + ONEDAY_UNIXTIME*3
    }
  }
  return AFTER_UNIXTTIME
}

module.exports = {
  getDeliverydayYMD,
  getDateFMSpreadSheetToLINE,
  getFmtDateForLINE,
  getDisplayFmtDate,
  getDayOfWeek,
  getOrderdayDisplayFmtDate,
  getdeliverydayDisplayFmtDate,
  getNextYMD,
  getNextAuctionDay,
}