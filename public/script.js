let score = 0;

// Инициализация Telegram Web Apps
Telegram.WebApp.ready();
const initData = Telegram.WebApp.initDataUnsafe;

// Отправьте initData на сервер для проверки
fetch('/api/verify-tonconnect', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ initData })
})
.then(response => response.json())
.then(result => {
    if (result.valid) {
        console.log('Server verification successful');
    } else {
        console.log('Server verification failed');
    }
})
.catch(error => {
    console.error('Error:', error);
});

document.getElementById('hamster').addEventListener('click', () => {
    score++;
    document.getElementById('score').textContent = `Очки: ${score}`;
});

document.getElementById('friends-btn').addEventListener('click', () => {
    document.getElementById('friends-modal').style.display = 'block';
});

document.getElementById('top-btn').addEventListener('click', () => {
    document.getElementById('top-modal').style.display = 'block';
});

document.getElementById('close-friends').addEventListener('click', () => {
    document.getElementById('friends-modal').style.display = 'none';
});

document.getElementById('close-top').addEventListener('click', () => {
    document.getElementById('top-modal').style.display = 'none';
});

// Пример данных для друзей и топа
const friends = ['Друг 1', 'Друг 2', 'Друг 3'];
const topPlayers = ['Игрок 1', 'Игрок 2', 'Игрок 3'];

const friendsList = document.getElementById('friends-list');
friends.forEach(friend => {
    const li = document.createElement('li');
    li.textContent = friend;
    friendsList.appendChild(li);
});

const topList = document.getElementById('top-list');
topPlayers.forEach(player => {
    const li = document.createElement('li');
    li.textContent = player;
    topList.appendChild(li);
});

// Отображение информации о пользователе
const userInfo = document.getElementById('user-info');
if (Telegram.WebApp.initDataUnsafe.user) {
    userInfo.textContent = `Привет, ${Telegram.WebApp.initDataUnsafe.user.first_name} ${Telegram.WebApp.initDataUnsafe.user.last_name}!`;
} else {
    console.log('Информация о пользователе не доступна');
}

// TonConnect Integration
document.addEventListener('DOMContentLoaded', async () => {
    const TonConnect = window.TonConnectSDK.TonConnect;
    const connector = new TonConnect({ manifestUrl: 'https://ratingers.pythonanywhere.com/ratelance/tonconnect-manifest.json' });

    // Elements
    const connectBtn = document.getElementById('connect-btn');
    
    // Event listener for TonConnect button
    connectBtn.addEventListener('click', async () => {
        const walletsList = await connector.getWallets();

        for (let wallet of walletsList) {
            if (wallet.embedded || wallet.injected) {
                connector.connect({ jsBridgeKey: wallet.jsBridgeKey }, { tonProof: 'doc-example-<BACKEND_AUTH_ID>' });
            } else if (wallet.bridgeUrl) {
                window.open(connector.connect({ universalLink: wallet.universalLink, bridgeUrl: wallet.bridgeUrl }, { tonProof: 'doc-example-<BACKEND_AUTH_ID>' }), '_blank');
            }
        }
    });

    // Verify signature function
    function verifySignature(walletInfo, signature, payload) {
        const publicKey = getPublicKeyFromWalletStateInit(walletInfo.account.walletStateInit);
        const message = new TextEncoder().encode(payload);
        const decodedSignature = TonConnect.utils.decodeBase64(signature);
        return TonConnect.utils.verifySignature(message, decodedSignature, publicKey);
    }

    function getPublicKeyFromWalletStateInit(stateInit) {
        const stateInitCell = TonConnect.boc.Cell.one_from_boc(stateInit);
        const dataCell = stateInitCell.refs[1];
        const publicKey = dataCell.bits.subbuffer(8, 32); // skip 8 bytes and take next 32 bytes
        return publicKey;
    }

    // Event listener for TonConnect status change
    connector.onStatusChange(async (walletInfo) => {
        if (walletInfo.connectItems && walletInfo.connectItems.tonProof) {
            const { payload, signature } = walletInfo.connectItems.tonProof.proof;
            const isValid = verifySignature(walletInfo, signature, payload);
            if (isValid) {
                userInfo.innerText = `Пользователь: ${walletInfo.account.address}`;
                console.log('Signature is valid');
            } else {
                userInfo.innerText = 'Ошибка: неверная подпись';
                console.log('Signature is invalid');
            }
        }
    });

    // Sending TonConnect proof data to the server
    connector.onStatusChange(async (walletInfo) => {
        if (walletInfo.connectItems && walletInfo.connectItems.tonProof) {
            const { payload, signature } = walletInfo.connectItems.tonProof.proof;

            // Send TonConnect proof data and Telegram initData to the server
            fetch('/api/verify-tonconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ initData, payload, signature })
            })
            .then(response => response.json())
            .then(result => {
                if (result.valid) {
                    userInfo.innerText = `Пользователь: ${walletInfo.account.address}`;
                    console.log('Server verification successful');
                } else {
                    userInfo.innerText = 'Ошибка: серверная проверка не прошла';
                    console.log('Server verification failed');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }
    });
});