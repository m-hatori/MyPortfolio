const { SecretManagerServiceClient } = require("@google-cloud/secret-manager")
const client = new SecretManagerServiceClient();

const getString = async (secret_name, secret_version) => {
    const versionPath = client.secretVersionPath(
        process.env.PROJECT_NUMBER,
        secret_name,
        secret_version
    );
    const [accessResponse] = await client.accessSecretVersion({name: versionPath});
    return accessResponse.payload.data.toString("utf8");
}

module.exports.secrets = async () => {return await getString(
    process.env.SECRETS_NAME,
    process.env.SECRETS_VERSION
)}

module.exports.fb_serviceAccount = async () => {return await getString(
    process.env.FB_SERVICE_ACCOUNT_NAME,
    process.env.FB_SEVICE_ACCOUNT_VERSION
)}

module.exports.googleDrive_serviceAccount = async () => {return await getString(
    process.env.SPREADSHHET_SEVICE_ACCOUNT_NAME,
    process.env.SPREADSHHET_SEVICE_ACCOUNT_VERSION
)}