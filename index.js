const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const SteamTotp = require('steam-totp');
const TradeOfferManager = require('steam-tradeoffer-manager');
const chalk = require('chalk');

// Config dosyasını içe aktar
const config = require('./config.json');

// Renk tanımlamaları
const timeColor = chalk.yellow;
const successColor = chalk.green;
const errorColor = chalk.red;
const retryColor = chalk.blue;
const startColor = chalk.red;
const loginColor = chalk.magenta;

// Her hesap için ayrı SteamCommunity nesneleri
const account1Community = new SteamCommunity();
const account2Community = new SteamCommunity();
const account1Client = new SteamUser();
const account2Client = new SteamUser();

// TradeOfferManager
const account1Manager = new TradeOfferManager({
    steam: account1Client,
    language: 'en',
    useAccessToken: true
});
const account2Manager = new TradeOfferManager({
    steam: account2Client,
    language: 'en',
    useAccessToken: true
});

// Config'den bilgiler
const account1 = config.account1;
const account2 = config.account2;
const itemConfig = config.item;

// Saat fonksiyonu
function getTime() {
    const now = new Date();
    return timeColor(`[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}]`);
}

// Bot başlatıldığında
console.log(startColor("Kaan's Steam Trade Farming Bot"));

// Account 1 login
function loginAccount1() {
    console.log(loginColor(`${getTime()} Logging in Account 1...`));
    const authCode = SteamTotp.generateAuthCode(account1.sharedSecret);
    console.log(loginColor(`${getTime()} 2FA code for Account 1 (${account1.username}): ${authCode}`));
    account1Client.logOn({
        accountName: account1.username,
        password: account1.password,
        twoFactorCode: authCode
    });
}

account1Client.on('loggedOn', () => {
    console.log(successColor(`${getTime()} Account 1 logged in`));
    account1Client.setPersona(SteamUser.EPersonaState.Online);
    account1Client.webLogOn();
});

account1Client.on('webSession', (sessionID, cookies) => {
    console.log(`${getTime()} Account 1 web session started, sessionID: ${sessionID}`);
    account1Manager.setCookies(cookies, (err) => {
        if (err) console.log(errorColor(`${getTime()} Account 1 cookie error: ${err.message}`));
        else console.log(`${getTime()} Account 1 cookies set`);
    });
    account1Community.setCookies(cookies);
});

account1Client.on('error', (err) => {
    console.log(errorColor(`${getTime()} Account 1 login error (${account1.username}): ${err.message}`));
    if (err.message.includes('RateLimitExceeded')) {
        console.log(`${getTime()} Too many attempts for Account 1, waiting 10 minutes...`);
        setTimeout(loginAccount1, 10 * 60 * 1000);
    }
});

// Account 2 login
function loginAccount2() {
    console.log(loginColor(`${getTime()} Logging in Account 2...`));
    const authCode = SteamTotp.generateAuthCode(account2.sharedSecret);
    console.log(loginColor(`${getTime()} 2FA code for Account 2 (${account2.username}): ${authCode}`));
    account2Client.logOn({
        accountName: account2.username,
        password: account2.password,
        twoFactorCode: authCode
    });
}

account2Client.on('loggedOn', () => {
    console.log(successColor(`${getTime()} Account 2 logged in`));
    account2Client.setPersona(SteamUser.EPersonaState.Online);
    account2Client.webLogOn();
});

account2Client.on('webSession', (sessionID, cookies) => {
    console.log(`${getTime()} Account 2 web session started, sessionID: ${sessionID}`);
    account2Manager.setCookies(cookies, (err) => {
        if (err) console.log(errorColor(`${getTime()} Account 2 cookie error: ${err.message}`));
        else console.log(`${getTime()} Account 2 cookies set`);
    });
    account2Community.setCookies(cookies);
});

account2Client.on('error', (err) => {
    console.log(errorColor(`${getTime()} Account 2 login error (${account2.username}): ${err.message}`));
    if (err.message.includes('RateLimitExceeded')) {
        console.log(`${getTime()} Too many attempts for Account 2, waiting 10 minutes...`);
        setTimeout(loginAccount2, 10 * 60 * 1000);
    }
});

// Takas onaylama fonksiyonu
function confirmTrade(community, identitySecret, offerId, callback, retryCount = 0) {
    const maxRetries = 3;
    const time = SteamTotp.time();
    const confKey = SteamTotp.getConfirmationKey(identitySecret, time, 'conf');
    const allowKey = SteamTotp.getConfirmationKey(identitySecret, time, 'allow');
    console.log(`${getTime()} Confirmation time: ${time}, confKey: ${confKey}, allowKey: ${allowKey}`);

    community.getConfirmations(time, confKey, (err, confirmations) => {
        if (err) {
            if (retryCount < maxRetries) {
                console.log(errorColor(`${getTime()} Confirmation error! ${err.message}`));
                console.log(retryColor(`${getTime()} Retrying (${retryCount + 1}/${maxRetries}) in 15 seconds...`));
                setTimeout(() => {
                    confirmTrade(community, identitySecret, offerId, callback, retryCount + 1);
                }, 15000);
            } else {
                callback(err);
            }
            return;
        }

        console.log(`${getTime()} Found confirmations: ${confirmations.length}`);
        const confirmation = confirmations.find(conf => conf.offerID === offerId.toString());
        if (!confirmation) {
            callback(new Error(`Confirmation not found! Offer ID: ${offerId}`));
            return;
        }

        confirmation.respond(time, allowKey, true, (err) => {
            if (err && retryCount < maxRetries) {
                console.log(errorColor(`${getTime()} Confirmation send error! ${err.message}`));
                console.log(retryColor(`${getTime()} Retrying (${retryCount + 1}/${maxRetries}) in 15 seconds...`));
                setTimeout(() => {
                    confirmTrade(community, identitySecret, offerId, callback, retryCount + 1);
                }, 15000);
            } else {
                callback(err);
            }
        });
    });
}

// Takas gönderme fonksiyonu
function sendTrade(senderManager, senderCommunity, senderAccount, receiverAccount, callback, retryCount = 0) {
    const maxRetries = 3;
    senderManager.getInventoryContents(itemConfig.appid, itemConfig.contextid, true, (err, inventory) => {
        if (err) {
            console.log(errorColor(`${getTime()} Inventory load error! ${err.message}`));
            if (retryCount < maxRetries) {
                console.log(retryColor(`${getTime()} Retrying (${retryCount + 1}/${maxRetries}) in 15 seconds...`));
                setTimeout(() => {
                    sendTrade(senderManager, senderCommunity, senderAccount, receiverAccount, callback, retryCount + 1);
                }, 15000);
            } else {
                callback(err);
            }
            return;
        }

        console.log(`${getTime()} Inventory loaded, item count: ${inventory.length}`);

        const scrapMetal = inventory.find(item => item.name === 'Scrap Metal');
        if (!scrapMetal) {
            console.log(errorColor(`${getTime()} Error! Scrap Metal not found in inventory`));
            callback(new Error('Scrap Metal not found'));
            return;
        }
        console.log(`${getTime()} Scrap Metal found, assetid: ${scrapMetal.assetid}`);

        const offer = senderManager.createOffer(receiverAccount.tradeUrl);
        offer.addMyItem({
            appid: itemConfig.appid,
            contextid: itemConfig.contextid,
            assetid: scrapMetal.assetid
        });
        offer.setMessage(`Trade #${tradeCount + 1} - Scrap Metal`);

        offer.send((err, status) => {
            if (err) {
                console.log(errorColor(`${getTime()} Trade send error! ${err.message}`));
                if (retryCount < maxRetries) {
                    console.log(retryColor(`${getTime()} Retrying (${retryCount + 1}/${maxRetries}) in 15 seconds...`));
                    setTimeout(() => {
                        sendTrade(senderManager, senderCommunity, senderAccount, receiverAccount, callback, retryCount + 1);
                    }, 15000);
                } else {
                    callback(err);
                }
                return;
            }
            console.log(`${getTime()} ${senderAccount.username} -> ${receiverAccount.username} Scrap Metal sent`);

            confirmTrade(senderCommunity, senderAccount.identitySecret, offer.id, (err) => {
                if (err) {
                    console.log(errorColor(`${getTime()} Confirmation error for ${senderAccount.username}! ${err.message}`));
                    callback(err);
                    return;
                }
                console.log(successColor(`${getTime()} ${senderAccount.username} confirmed the trade`));
                callback(null);
            });
        });
    });
}

// Gelen takasları otomatik kabul et ve geri gönder
function setupAutoAcceptAndReturn(manager, community, account, otherAccount) {
    manager.on('newOffer', (offer) => {
        console.log(`${getTime()} New trade received, ID: ${offer.id}, from: ${offer.partner}`);

        if (offer.itemsToGive.length === 0 && offer.itemsToReceive.length > 0) {
            console.log(`${getTime()} Gift trade detected, ID: ${offer.id}, accepting...`);
            function tryAccept(retryCount = 0) {
                const maxRetries = 3;
                offer.accept((err, status) => {
                    if (err) {
                        console.log(errorColor(`${getTime()} Trade accept error (ID: ${offer.id})! ${err.message}`));
                        if (retryCount < maxRetries) {
                            console.log(retryColor(`${getTime()} Retrying (${retryCount + 1}/${maxRetries}) in 15 seconds...`));
                            setTimeout(() => {
                                tryAccept(retryCount + 1);
                            }, 15000);
                        }
                        return;
                    }
                    console.log(successColor(`${getTime()} ${account.username} accepted the trade`));
                    console.log(`${getTime()} ${account.username} sending back...`);
                    tradeCount++;
                    sendTrade(manager, community, account, otherAccount, (err) => {
                        if (err) {
                            console.log(errorColor(`${getTime()} Send back error! ${err.message}`));
                        } else {
                            console.log(`${getTime()} Trade cycle continues...`);
                        }
                    });
                });
            }
            tryAccept();
        } else {
            console.log(`${getTime()} Trade #${offer.id} is not a gift, not accepted`);
        }
    });
}

// Takas döngüsü
let tradeCount = 0;
let currentHolder = 'account1';

function startTradeLoop() {
    console.log(`${getTime()} Trade cycle starting, current holder: ${currentHolder === 'account1' ? account1.username : account2.username}`);
    if (currentHolder === 'account1') {
        sendTrade(account1Manager, account1Community, account1, account2, (err) => {
            if (err) {
                console.log(errorColor(`${getTime()} Initial trade error! ${err.message}`));
                setTimeout(startTradeLoop, 60000);
            }
        });
    } else {
        sendTrade(account2Manager, account2Community, account2, account1, (err) => {
            if (err) {
                console.log(errorColor(`${getTime()} Initial trade error! ${err.message}`));
                setTimeout(startTradeLoop, 60000);
            }
        });
    }
}

// Her iki istemci hazır olduğunda döngüyü başlat
let account1Ready = false;
let account2Ready = false;

account1Client.on('webSession', () => {
    if (!account1Ready) {
        account1Ready = true;
        console.log(`${getTime()} Account 1 ready, waiting for Account 2...`);
        setupAutoAcceptAndReturn(account1Manager, account1Community, account1, account2);
        if (account1Ready && account2Ready) startTradeLoop();
    }
});

account2Client.on('webSession', () => {
    if (!account2Ready) {
        account2Ready = true;
        console.log(`${getTime()} Account 2 ready, waiting for Account 1...`);
        setupAutoAcceptAndReturn(account2Manager, account2Community, account2, account1);
        if (account1Ready && account2Ready) startTradeLoop();
    }
});

// İlk giriş denemeleri
loginAccount1();
loginAccount2();

// Botu durdurmak için Ctrl+C
process.on('SIGINT', () => {
    console.log(`${getTime()} Bot shutting down...`);
    account1Client.logOff();
    account2Client.logOff();
    process.exit();
});