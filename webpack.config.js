const path = require("path")
const nodeExternals = require("webpack-node-externals")
const webpack = require("webpack");
const DATE = new Date()

module.exports.default = {
  //debelopment:開発、production:製品
  mode: "development",

  //特定の環境用のランタイム コードを生成するように webpack に指示します。 Node.jsのバージョン
  target: "node16.18",

  //入力元
  entry: {
    index: path.resolve(__dirname, "./src/index.js"),
  },

  //出力先
  output: {
    filename: "main.js",
    libraryTarget: "commonjs",
  },

  //node_moduleで警告が出るためwebpack-node-externalsを使って除外指定(externals)します。 webpack-node-externalsは次のコマンドでインストールできます。
  externals: [nodeExternals()],

  //ファイルが変更されたらwebpackする設定
  watch: false,
  watchOptions: {
    aggregateTimeout: 10000, //ミリ秒 何秒おきに再構築するか
    ignored: /node_modules/,  //パッケージを追加した際はコメントアウトすること
    poll: 1000,
  },
	plugins: [
		new webpack.BannerPlugin({
			banner:"//license: kounosukaki" + "\n" + "//codeing: Masafumi Hatori <masamasayahoo@gamil.com>" + "\n//" + DATE,
      raw:true
		})
	]

}