#!/bin/bash

echo "Cleaning node_modules..."
rm -rf node_modules

echo "Cleaning package-lock.json..."
rm -f package-lock.json

echo "Installing dependencies..."
npm install

echo "Installation complete. Try running the app now."
