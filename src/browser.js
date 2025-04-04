const puppeteer = require('puppeteer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'data', '.env') });

let browser;
let page;

async function initializeBrowser() {
    browser = await puppeteer.launch({ headless: true, slowMo: 5 });
    page = await browser.newPage();
    await page.goto('https://tbepanel.com/');

    await page.type('#login', process.env.LOGIN); 
    await page.type('#password', process.env.PASSWORD); 

    await Promise.all([
        page.click('#submit_btn'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
}

function getPage() {
    return page;
}

function getBrowser() {
    return browser;
}

module.exports = { initializeBrowser, getPage, getBrowser };
