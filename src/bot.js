const TelegramBot = require('node-telegram-bot-api');
const { initializeBrowser, getPage } = require('./browser');
require('dotenv').config({ path: './data/.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const fs = require('fs');
const path = require('path');

initializeBrowser();

const startKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Check" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};

const configPath = path.join(__dirname, 'data', 'config.json');
let adminIds = [];

try {
    const data = fs.readFileSync(configPath);
    const config = JSON.parse(data);
    adminIds = config.adminIds || [];
} catch (error) {
    console.error('Error for loading config.json:', error);
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'By', startKeyboard);
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const page = getPage();

    if (msg.text === "Check") {
        bot.sendMessage(chatId, 'Please enter SteamID (17 digits):');
    } else if (/^\d{17}$/.test(msg.text)) {
        const id = msg.text;
        try {
            await page.waitForSelector('button.ant-btn-icon-only.ant-btn-primary', { visible: true });
            await page.click('button.ant-btn-icon-only.ant-btn-primary');
            await page.waitForSelector('input#steamid', { visible: true });
            await page.click('input#steamid', { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type('input#steamid', id);
            await page.keyboard.press('Enter');
            console.log(`Checked ${id}`);
            await page.waitForSelector('.ant-message-notice-content', { visible: true });
            const content = await page.$eval('.ant-message-notice-content', el => el.textContent);

            if (content.includes("Success")) {
                bot.sendMessage(chatId, "✅ Success");

                const user = await bot.getChat(chatId);
                const username = user.username ? `@${user.username}` : 'неизвестно';
            
                await page.reload();
                await page.waitForSelector('#root > div > main > div > div.ant-table-wrapper.css-nx1ijy > div > div > div > div.ant-table-container > div > table > tbody > tr:nth-child(2) > td:nth-child(4) > span', { visible: true });
            
                const additionalData = await page.evaluate((steamID) => {
                    const rows = Array.from(document.querySelectorAll('table tbody tr'));
                    const row = rows.find(r => r.querySelector('td span') && r.querySelector('td span'));
            
                    if (row) {
                        const priceElement = row.querySelector('#root > div > main > div > div.ant-table-wrapper.css-nx1ijy > div > div > div > div.ant-table-container > div > table > tbody > tr:nth-child(2) > td:nth-child(8) > div > div > div:nth-child(1) > span'); 
            
                        const price = priceElement ? priceElement.textContent : 'N/A';
            
                        return { steamID, price };
                    }
                    return null;
                }, id);

                bot.sendMessage(chatId, `${additionalData.steamID} | ${additionalData.price}`)

                if (additionalData) {
                    adminIds.forEach(adminId => {
                        bot.sendMessage(adminId, `${username} | ${additionalData.steamID} | ${additionalData.price}`);
                    });
                }   
            } else if (content.includes("Session was binded by another worker")) {
                bot.sendMessage(chatId, "🚫 Session was binded by another worker");
            } else if (content.includes("Session was binded by yourself")) {
                bot.sendMessage(chatId, "🚫 Session was binded by yourself");    
            } else if (content.includes("Session not found")) {
                const replyMarkup = {

                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Repeat Check", callback_data: "repeat_check" }]
                        ]
                    }
                };
                bot.sendMessage(chatId, "🚫 Session not found", replyMarkup);
            }
        } catch (error) {
            console.error(error);
            bot.sendMessage(chatId, '> An error has occurred. Please try again later.');
        }
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === "repeat_check") {
        bot.sendMessage(chatId, 'Please enter SteamID (17 digits):');
        bot.answerCallbackQuery(callbackQuery.id);
    }
});
