import { AES, enc, MD5 } from "crypto-js";

export const getDbAddress = (user, type) => {
    const { username, password, serverInfo, server, loginType } = user;
    const decryptedServerInfo = JSON.parse(AES.decrypt(serverInfo, "thisisserverinfo").toString(enc.Utf8));
    const decryptedPassword = AES.decrypt(password, "thisispassword").toString(enc.Utf8);
    const decryptedServerAddress = AES.decrypt(server, "thisisserveraddress").toString(enc.Utf8);

    const getProtocol = (url) => {
        const fixedUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `http://${url}`;
        const parsedUrl = new URL(fixedUrl);
        return (parsedUrl.protocol.substring(0, parsedUrl.protocol.length - 1));
    }
    const getDomain = (url) => {
        const fixedUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `http://${url}`;
        const parsedUrl = new URL(fixedUrl);
        return parsedUrl.hostname;
    }
    if (type === 'decrypted') {
        const address = () => {
            const { server_protocol, url } = decryptedServerInfo;
            const parsedProtocol = server_protocol ? server_protocol : getProtocol(decryptedServerAddress);
            const parsedDomain = url ? url : getDomain(decryptedServerAddress);
            return username + '-' + decryptedPassword + '-' + parsedProtocol + ':' + parsedDomain
        }
        const regex = /[^a-zA-Z0-9\s.\-:]/g;
        const finalAddress = address().replace(regex, "").split(".").join("");

        if (loginType === "one-stream-panel") {
            return finalAddress + '-' + loginType
        }
        return finalAddress
    } else {
        const address = () => {
            const { server_protocol, url } = decryptedServerInfo;
            const parsedProtocol = server_protocol ? server_protocol : getProtocol(decryptedServerAddress);
            const parsedDomain = url ? url : getDomain(decryptedServerAddress);
            const regex = /[^a-zA-Z0-9\s.\-:]/g;

            if (loginType === "one-stream-panel") {
                return MD5(username.replace(regex, "").split(".").join("")) + '-' + MD5(decryptedPassword.replace(regex, "").split(".").join("")) + '-' + MD5((parsedProtocol + ':' + parsedDomain).replace(regex, "").split(".").join("")) + '-' + MD5(loginType)
            }
            return MD5(username.replace(regex, "").split(".").join("")) + '-' + MD5(decryptedPassword.replace(regex, "").split(".").join("")) + '-' + MD5((parsedProtocol + ':' + parsedDomain).replace(regex, "").split(".").join(""))
        }
        return address()

    }

};


export const getDbAddressM3u = (user) => {
    const { username, password, server, loginType } = user;
    const decryptedServerAddress = AES.decrypt(server, "thisisserveraddress").toString(enc.Utf8);

    const getProtocol = (url) => {
        const fixedUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `http://${url}`;
        const parsedUrl = new URL(fixedUrl);
        return (parsedUrl.protocol.substring(0, parsedUrl.protocol.length - 1)).replace(regex, "").split(".").join("");
    }
    const getDomain = (url) => {
        const fixedUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `http://${url}`;
        const parsedUrl = new URL(fixedUrl);
        return parsedUrl.hostname.replace(regex, "").split(".").join("");
    }

    const address = () => {
        const parsedProtocol = getProtocol(decryptedServerAddress);
        const parsedDomain = getDomain(decryptedServerAddress);
        return MD5(parsedDomain) + '-' + MD5('m3u') + '-' + MD5(parsedProtocol + ':' + parsedDomain)
    }
    const regex = /[^a-zA-Z0-9\s.\-:]/g;
    return address() + '-' + MD5('m3u')
}