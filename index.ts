const fs = require("fs");
const puppeteer = require("puppeteer");
const chalk = require("chalk");
// Import config from .env
require("dotenv").config();
//Load DB reqs
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const OUTPUT_DIR = "./out";
// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR);
}

const adapter = new FileSync(`${OUTPUT_DIR}/db.json`);
const db = lowdb(adapter);

interface PowerEntrySchema {

}

db.defaults({ entries: [] }).write();

function sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

function valid_config() {
    const req_config = ["EMAIL", "PASSWORD", "MFA_ANSWER", "ACCOUNT_ID", "METER_NUM"]
    return req_config.every(config => {
        if (!process.env[config]) {
            console.log(chalk.red(`${config} is not set in the .env config! Exiting...`));
            return false;
        }
        return true;
    })
}

async function coned_login(browser) {
    const page = await browser.newPage();
    // Login to ConEd website
    await page.goto("https://www.coned.com/en/login");
    await page.type("#form-login-email", process.env.EMAIL);
    await page.type("#form-login-password", process.env.PASSWORD);
    await page.click("#form-login-remember-me");
    await page.click(".submit-button");
    // Wait for login to authenticate
    await sleep(10000);
    // Enter in 2 factor auth code (see README for details)
    await page.type("#form-login-mfa-code", process.env.MFA_ANSWER);
    await page.click(".js-login-new-device-form .button");
    // Wait for authentication to complete
    await page.waitForNavigation();
}

async function coned_read(browser):  Promise<[string, any]> {
    return new Promise(async (resolve) => {
        // Access the API using your newly acquired authentication cookies!
        const api_page = await browser.newPage();
        const api_url = `https://cned.opower.com/ei/edge/apis/cws-real-time-ami-v1/cws/cned/accounts/${process.env.ACCOUNT_ID}/meters/${process.env.METER_NUM}/usage`;
        await api_page.goto(api_url);
        const data_elem = await api_page.$("pre");
        const text_data = await api_page.evaluate((el: HTMLElement) => el.textContent, data_elem);
        const raw_data = JSON.parse(text_data);
        //api_page.close();
        resolve([text_data, raw_data]);
    });
}

async function coned_fetch() {
    if(!valid_config()) {
        return;
    }
    const browser = await puppeteer.launch({defaultViewport: {width: 1920, height: 1080}});
    coned_login(browser);
    await sleep(5000);
    let text_data = "";
    let raw_data = {};
    [text_data, raw_data] = await coned_read(browser);
    while ("error" in raw_data) {
        console.log(chalk.yellow("Failed to fetch data from API:", raw_data["error"]["details"]));
        [text_data, raw_data] = await coned_read(browser);
        await sleep(5000);
    }
    console.log(chalk.green("Successfully retrieved API data!"))
    fs.writeFileSync(`${OUTPUT_DIR}/raw_coned_data.json`, text_data);
    await browser.close();
}

coned_fetch();