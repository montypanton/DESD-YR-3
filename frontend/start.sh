#!/bin/sh
npm install
export WATCHPACK_POLLING=true
npm start -- --polling
