const axios = require("axios");

/*
//TOOD: 未確認 APIリクエストのリトライ処理
function requestRetry(res, epUrl, propUser, message, to, retryKey){

  let user = new User(to)

  const _stateCode = res.getResponseCode()
  console.log(`stateCode : ${_stateCode}`)

  let retryTimes = Number(propUser.getProperty(user.lineId_crypto + "_retryTimes"))
  console.log(`retryTimes : ${retryTimes}`)

  //stateCode:500  内部サーバーのエラー
  //リトライ回数 reTryTime:5回で終了する
  if(_stateCode == 500 && (retryTimes === null || retryTimes <= 5)){
    
    //リトライ回数の更新
    propUser.setProperty(user.lineId_crypto + "_retryTimes", retryTimes + 1)
    
    console.log(`stateCode : ${prop.getProperty("retryTimes")}`)

    sendMessage(epUrl, message, to, retryKey)
    return 500
  }
  else{
    propUser.setProperty(user.lineId_crypto + "_retryTimes", 0)
    return 200
  }
}
*/
class HttpsRequest{
  constructor(){
    this.ACCESSTOKEN = ""
    //LINEサーバー エンドポイントURL 一般後記されているのでセキュリティ保護の必要なし
    this.epUrls = {
      "reply"     :"https://api.line.me/v2/bot/message/reply",
      "push"      :"https://api.line.me/v2/bot/message/push",
      "multi"     :"https://api.line.me/v2/bot/message/multicast",
      "narrow"    :"https://api.line.me/v2/bot/message/narrowcast",
      "broadcast" :"https://api.line.me/v2/bot/message/broadcast",
      "profile"   :"https://api.line.me/v2/bot/profile/",
      "ids"       :"https://api.line.me/v2/bot/followers/ids"
    }
  }

  console_Success(STATE, response){
    console.log(`${STATE}  res state: ${response.statusText} ${response.status}`);
    //console.log(response.headers);
    //console.log(response.data);
    //console.log(response.config);
    return
  }

  console_Error(STATE, error){
    if(error.response){
      console.log(`${STATE}  res state: ${error.statusText} ${error.status}`);
      console.error(`res header: ${JSON.stringify(error.response.headers)}`);
      console.error(`res data: ${JSON.stringify(error.response.data)}`);
    }
    else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.error(JSON.stringify(error.request));
    } 
    else{
      console.error(error.message);
    }
    //console.error(error.config);
    return
  }    
  
  //POST Request
  async httpsRequestByAxios(STATE, URL, data){

    axios.defaults.headers.method = "POST"
    axios.defaults.headers.post['Content-Type'] = "application/json;";
    axios.defaults.headers.common["Authorization"] = "Bearer " + this.ACCESSTOKEN;

    //https Post Request
    return await axios.post(URL, data)
      .then((response) => {        
        return this.console_Success(STATE, response)
      })
      .catch((error) => {
        return this.console_Error(STATE, error)
      });
  }

  //GET Requeset
  async httpsGETRequestByAxios(STATE, URL){
    axios.defaults.headers.method = "GET"
    axios.defaults.headers.common["Authorization"] = "Bearer " + this.ACCESSTOKEN;

    //https Post Request
    return await axios.get(URL)
      .then((response) => {
        return this.console_Success(STATE, response)
      })
      .catch((error) => {
        return this.console_Error(STATE, error)
      });
  }

  //DELETE Requeset
  async httpsDELETERequestByAxios(STATE, URL){
    axios.defaults.headers.method = "DELETE"
    axios.defaults.headers.common["Authorization"] = "Bearer " + this.ACCESSTOKEN;

    //https Post Request
    return await axios.delete(URL)
      .then((response) => {
        return this.console_Success(STATE, response)
      })
      .catch((error) => {
        return this.console_Error(STATE, error)
      });
  }

  //Reply
  async replyMessageByAxios(event, messagesArray){
    const DATA = JSON.stringify({
      replyToken: event.replyToken,
      messages: messagesArray
    });  
    
    return await this.httpsRequestByAxios("返信", this.epUrls.reply, DATA)
  }
    
  //Push
  async pushMessageByAxios(userIds, messagesArray){
    const DATA = JSON.stringify({
        "notificationDisabled":false,//false：ユーザに通知する true：ユーザに通知しない
        "to": userIds,
        "messages": messagesArray
    });

    return await this.httpsRequestByAxios("プッシュ", this.epUrls.push, DATA)
  }

  //RichMenu
  //ユーザーリッチメニュー設定
  setRichMenu(userId, richMenuId) {
    const URL = `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`
    return this.httpsRequestByAxios("リッチメニュー更新", URL)
  }

  //ユーザーリッチメニュー解除
  resetRichMenu(userId) {
    const URL = `https://api.line.me/v2/bot/user/${userId}/richmenu`
    return this.httpsDELETERequestByAxios("リッチメニュー初期化", URL)
  }

  //●LINEプロフィールプロフィール取得
  async getUserProfile(userId){ 
    const URL = `${this.epUrls.profile}${userId}`
    return await this.httpsGETRequestByAxios("LINEプロフィールプロフィール取得", URL)
  }

  //LINE名取得
  async getLineUserName(userId){
    const res = await this.getUserProfile(userId)
    return res.data.displayName;
  }

  /*
  //ユーザーリッチメニュー取得
  async function getUserRichMenu(userId){
    const URL = "https://api.line.me/v2/bot/user/" + userId + "/richmenu";
    return await httpsGETRequestByAxios(URL)
  }
  */
}
module.exports = HttpsRequest