const { SecretManagerServiceClient } = require("@google-cloud/secret-manager")
const client = new SecretManagerServiceClient();

//シークレット情報 取得
module.exports.getString = async (secret_name, secret_version) => {//なぜかグローバル定数定義の際に呼び出せない
  const projectId = process.env.PROJECT_NUMBER
  const versionPath = client.secretVersionPath(projectId, secret_name, secret_version);
  const [accessResponse] = await client.accessSecretVersion({name: versionPath});
  return accessResponse.payload.data.toString("utf8");
}