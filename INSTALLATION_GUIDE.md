# Case Unknown — Setup Guide

This ZIP contains the source code for the Case Unknown web app. It is not an Android APK.

## What you need on a computer

1. Install Node.js 22 or newer from https://nodejs.org/
2. Install Visual Studio Code from https://code.visualstudio.com/
3. Extract `case-unknown-source.zip` into a normal folder.
4. Open Visual Studio Code.
5. Choose **File → Open Folder** and select the extracted `case-unknown` folder.
6. In Visual Studio Code choose **Terminal → New Terminal**.
7. Run: `npm install`
8. After installation finishes, run: `npm run dev`
9. Open the local address shown in the terminal, normally `http://localhost:3000` or `http://localhost:5173`.

## Where the important parts go

- `app/page.tsx`: the complete game generator, screens, roles, evidence, and solution logic.
- `app/globals.css`: colors, fonts, cards, and mobile layout.
- `app/layout.tsx`: app title and browser metadata.
- `public/`: icons and any future images or sound files.
- `components/ui/`: reusable buttons, inputs, cards, and other controls.
- `.openai/hosting.json`: ChatGPT Sites publication settings. Do not put API keys here.

## Adding an AI API later

Keep API keys in a local `.env` file or in your hosting provider's secret/environment settings. Never put a private key directly in `app/page.tsx` because visitors could see it.

## Using it on multiple phones

The host opens the published site and selects **Create room**. Friends open the shared invitation link or the same site, select **Join room**, enter the five-character code, and choose a name. The server keeps one synchronized case while showing each phone only its player's private role.

Open the published URL in Chrome and select **Add to Home screen** to make it appear like an app. A native Android APK is not required.
