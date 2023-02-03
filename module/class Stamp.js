//11/29 Done
//●●オブジェクト：スタンプ
//https://developers.line.biz/ja/docs/messaging-api/sticker-list/#sticker-definitions

class StampMessage{
  // プロパティを追加する
  constructor() {
     this.OK = this.getStampMessage(16581242)
     this.ありがとう = this.getStampMessage(16581243)
     this.助かります = this.getStampMessage(16581244)
     this.はい = this.getStampMessage(16581245)
     this.いかがですか = this.getStampMessage(16581246)
     this.大丈夫です = this.getStampMessage(16581247)
     this.よろしくお願いします = this.getStampMessage(16581248)
     this.確認します = this.getStampMessage(16581249)
     this.申し訳ございません = this.getStampMessage(16581250 )
     this.楽しみです = this.getStampMessage(16581251)
     this.お疲れ様です = this.getStampMessage(16581252)
     this.ハート = this.getStampMessage(16581253)
     this.さすがです = this.getStampMessage(16581254)
     this.うれしいです = this.getStampMessage(16581255)
     this.なるほどです = this.getStampMessage(16581256)
     this.何卒 = this.getStampMessage(16581257)
     this.ううん = this.getStampMessage(16581258)
     this.お手数おかけします = this.getStampMessage(16581259)
     this.おはようございます = this.getStampMessage(16581260)
     this.おやすみなさい = this.getStampMessage(16581261)
     this.悲しい = this.getStampMessage(16581262)
     this.あわあわ = this.getStampMessage(16581263)
     this.ごちそうさまでした = this.getStampMessage(16581264)
     this.がんばってください = this.getStampMessage(16581265)
  }


  getStampMessage(stickerId){
    let message  ={
      "type": "sticker",
      "packageId": 8515,
      "stickerId": stickerId
      }
    return message
  }

}
module.exports = StampMessage;