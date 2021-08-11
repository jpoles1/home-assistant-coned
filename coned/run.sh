#!/bin/bash

CONFIG_PATH=/data/options.json

export EMAIL="$(jq --raw-output '.email' $CONFIG_PATH)"
export PASSWORD="$(jq --raw-output '.password' $CONFIG_PATH)"
export MFA_TYPE="$(jq --raw-output '.mfa_type' $CONFIG_PATH)"
export MFA_SECRET="$(jq --raw-output '.mfa_secret' $CONFIG_PATH)"
export ACCOUNT_UUID="$(jq --raw-output '.account_uuid' $CONFIG_PATH)"
export METER_NUM="$(jq --raw-output '.meter_number' $CONFIG_PATH)"
export SITE="$(jq --raw-output '.site' $CONFIG_PATH)"

echo "Params:"
echo "EMAIL =" $EMAIL
echo "PASSWORD =" $(sed 's/^........../**********/' <<<$PASSWORD)
echo "MFA_TYPE =" $MFA_TYPE
echo "MFA_SECRET =" $(sed 's/^........../**********/' <<<$MFA_SECRET)
echo "ACCOUNT_UUID =" $ACCOUNT_UUID
echo "METER_NUM =" $METER_NUM
echo "SITE =" $SITE

# Start the listener and enter an endless loop
echo "Starting server!"
npm start
