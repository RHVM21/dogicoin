const crypto = require('crypto');
const nacl = require('tweetnacl');

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { initData, payload, signature } = req.body;
        const botToken = process.env.BOT_TOKEN; // Используйте переменную окружения для токена

        // Проверка initData (Telegram Web Apps)
        const secretKey = crypto.createHash('sha256').update(botToken).digest();
        const checkString = initData.split('&')
            .sort()
            .map(kv => kv.split('='))
            .map(([k, v]) => `${k}=${decodeURIComponent(v)}`)
            .join('\n');
        const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
        const queryParams = new URLSearchParams(initData);
        const isValidInitData = queryParams.get('hash') === hmac;

        // Проверка TonConnect
        const verifyTonConnect = (payload, signature) => {
            const publicKey = Buffer.from(payload.publicKey, 'base64');
            const message = Buffer.from(payload.message, 'base64');
            const decodedSignature = Buffer.from(signature, 'base64');
            return nacl.sign.detached.verify(message, decodedSignature, publicKey);
        };

        let isValidTonConnect = false;
        if (payload && signature) {
            isValidTonConnect = verifyTonConnect(payload, signature);
        }

        if (isValidInitData && isValidTonConnect) {
            res.status(200).json({ valid: true });
        } else {
            res.status(400).json({ valid: false });
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};