# Mint, an SLP Management Suite

## Create and control your Bitcoin Cash SLP Tokens in your browser

_Mint is client-only: the app runs in your web browser. Mint uses rest.bitcoin.com as the default back-end, but the user may select any backend. Mint is non-custodial and does not have access to your private keys. You must back up your wallet to recover your funds._

**We're pleased to announce that pitico is now a award-winning project! We won 3rd place in the Simple Ledger Virtual Hackathon (SLPVH) 2019: https://simpleledger.info/slpvh/**

### Features

- Create your own SLP token
- Pay BCH dividends to SLP token holders
- Mint (create additional token supply for tokens without fixed supply)
- Send & Receive BCH and SLP tokens
- Import existing wallets
- Choose your own REST API (default: rest.bitcoin.com)
- Hosted online at https://mint.bitcoin.com or run locally with `npm start`

### Learn more about the Simple Ledger Protocol: https://simpleledger.cash/

## Development

In the project directory, run:

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

## Production

In the project directory, run:

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Mint Project Roadmap

Mint will continue adding new features to best support user-friendly SLP token management. If you have an idea for a feature, please create an issue in this repository.

The following features are under active development:

- Custom OP_RETURN notes on user-created dividend transactions
- SLP Airdrops (send any user-specified SLP token to holders of any user specified SLP token) up to 10,000 recipients
- HD wallet support, including seed importing from [the Bitcoin.com mobile wallet](https://wallet.bitcoin.com/)
