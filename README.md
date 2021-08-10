# ConEd Realtime Data Fetch

This repo contains a Node.js script which automates the retreival of realtime usage data from the ConEd opower.com API. The data is returned as a JSON file which can then be processed further as part of a data pipeline. This repo does not do much with the retreived data as of yet, and is instead intended to help others as a jumping-off point for their projects.

## Quickstart

In order to run the script you must have a recent version of Node.js installed. Then use the following instructions to start retreiving your data!

Install the deps:

```
npm install
```

Copy `example.env` to `.env` and input your account information. See below for MFA setup:

```
EMAIL=test@test.com
PASSWORD=correcthorsebatterystaple
MFA_SECRET=youranswerhere
ACCOUNT_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
METER_NUM=XXXXXXX
```

Run the script and use the JSON file output for whatever you need!

```
node index.js
```

## MFA Setup

You can bypass 2-factor authenication by doing the following:

1) Login to ConEd, and go to your profile. Reset your 2FA method, but do not complete the registration. 
2) Clear your cookies or use incognito and re-open the ConEd website.
3) Log back in to your account and you should be prompted to re-establish your 2FA.
4) Select use text message for your 2FA method. 
5) You should then be presented with an option to say you do not have texting on your phone. Select this and you should be able to use a security question instead.
6) Create a security question and enter your answer into the .env config as detailed above!
 