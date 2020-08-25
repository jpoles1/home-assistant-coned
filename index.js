const fs = require("fs");
const puppeteer = require("puppeteer");
const chalk = require("chalk");
// Import config from .env
require("dotenv").config();

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

async function conded_fetch() {
    if(!valid_config()) {
        return;
    }
    const browser = await puppeteer.launch({defaultViewport: {width: 1920, height: 1080}});
    const page = await browser.newPage();
    // Login to ConEd website
    await page.goto("https://www.coned.com/en/login");
    await page.type("#form-login-email", process.env.EMAIL);
    await page.type("#form-login-password", process.env.PASSWORD);
    await page.click("#form-login-remember-me");
    await page.click(".submit-button");
    // Wait for login to authenticate
    await page.waitFor(5000);
    // Enter in 2 factor auth code (see README for details)
    await page.type("#form-login-mfa-code", process.env.MFA_ANSWER);
    await page.click(".js-login-new-device-form .button");
    // Wait for authentication to complete
    await page.waitForNavigation();
    // Access the API using your newly acquired authentication cookies!
    const api_page = await browser.newPage();
    const api_url = `https://cned.opower.com/ei/edge/apis/cws-real-time-ami-v1/cws/cned/accounts/${process.env.ACCOUNT_ID}/meters/${process.env.METER_NUM}/usage`;
    await api_page.goto(api_url);
    const data_elem = await api_page.$("pre");
    const raw_data = await api_page.evaluate(el => el.textContent, data_elem);
    console.log(raw_data);
    fs.writeFileSync("raw_coned_data.json", raw_data);
    await browser.close();
}

conded_fetch();