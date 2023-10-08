const functions = require('firebase-functions');
const logger = functions.logger
const axios = require("axios");
const uuid = require("uuid");

const max_retryTime = 5 //再試行最大回数
const retryDelayTime = 100 //再試行遅延時間 ms

//再試行メソッド追記
class HttpsRequest{
  constructor(ACCESSTOKEN){
    this.ACCESSTOKEN = ACCESSTOKEN
    
    this.epUrls = {
      "reply"     :"https://api.line.me/v2/bot/message/reply",
      "push"      :"https://api.line.me/v2/bot/message/push",
      "multi"     :"https://api.line.me/v2/bot/message/multicast",
      "narrow"    :"https://api.line.me/v2/bot/message/narrowcast",
      "broadcast" :"https://api.line.me/v2/bot/message/broadcast",
      "ids"       :"https://api.line.me/v2/bot/followers/ids"
    }

    axios.defaults.timeout = 60 * 1000;
    axios.defaults.headers.common["Authorization"] = "Bearer " + this.ACCESSTOKEN;
    axios.defaults.headers.post['Content-Type'] = "application/json;";    
  }

  console_Success(STATE, response){
    const RES_STATE = `${STATE}  res state: ${response.statusText} ${response.status}`

    if(response.status == 200){logger.log(RES_STATE);}
    else{logger.warn(RES_STATE)}
    return response
  }

  console_Error(STATE, error){    
    if(error.response){
      logger.error(`${STATE}  res state: ${error.statusText} ${error.status}`);
      logger.log(`res header: ${JSON.stringify(error.response.headers)}`);
      logger.log(`res data: ${JSON.stringify(error.response.data)}`);
      return error.status
    }
    else if (error.request) {
      logger.error(JSON.stringify(error.request));
    } 
    else{
      logger.error(error.message);
    }
    //logger.error(error.config);
    return 0    
  }

  async request(STATE = "", method = "get", URL = "", data = {}, X_Line_Retry_Key = "", retryTime = 1){
    console.log(`${STATE} ${retryTime}回目`)

    //リトライキー生成
    if(X_Line_Retry_Key == ""){X_Line_Retry_Key = uuid.v4()}

    const instance = axios.create();
    //console.debug(`X_Line_Retry_Key: ${X_Line_Retry_Key}`)

    return await instance.request({
      method: method,
      url: URL,      
      headers: {"X-Line-Retry-Key": X_Line_Retry_Key},
      data: data
    }).then(async (response) => {
        return this.console_Success(STATE, response)
      })
      .catch(async (error) => {
        const error_status = this.console_Error(STATE, error)

        if(error_status != 500) throw error

        if(retryTime == max_retryTime) throw error  //再試行終了

        //再試行
        await new Promise(resolve => setTimeout(resolve, retryDelayTime)); //待機
        return await this.request(STATE, method, URL, data, X_Line_Retry_Key, retryTime + 1)
      });
  }

  //LINEサーバー Reply
  async replyMessageByAxios(event, messagesArray){
    const messageNum = messagesArray.length
    if(messageNum > 0 && messageNum <= 5){
      const data = JSON.stringify({
        replyToken: event.replyToken,
        messages: messagesArray
      });  
  
      return await this.request("返信", "post", this.epUrls.reply, data)
    }
    else if(messageNum > 5){logger.error(`リプライメッセージ数: ${messageNum}`)}
    else{logger.warn(`リプライメッセージ数: ${messageNum}`)}
    return
  }
    
  //LINEサーバー Push
  async pushMessageByAxios(userIds, messagesArray){
    const data = JSON.stringify({
      "notificationDisabled":false,//false：ユーザに通知する true：ユーザに通知しない
      "to": userIds,
      "messages": messagesArray
    });
    console.log(`宛先: ${userIds}`)
    
    return await this.request("プッシュ", "post", this.epUrls.push, data)
  }  
}
module.exports = HttpsRequest