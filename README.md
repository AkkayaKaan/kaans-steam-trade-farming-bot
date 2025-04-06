# Kaan's Steam Trade Farming Bot
Welcome to **Kaan's Steam Trade Farming Bot**! This bot automates trading between two Steam accounts, endlessly cycling the item named Scrap Metal from TF2. It’s optimized for Steam trade farming and designed to increase the number of trades performed on Steam.

## Features
✅ **Automated Trading**: Sends and accepts trades automatically.
✅ **Item Cycling**: Loops a single item (e.g., Scrap Metal) between accounts.
✅ **Error Handling**: Retries failed actions up to 3 times with 15-second delays.
✅ **Simple Setup**: Includes batch files for quick installation on Windows.

## Prerequisites
Ensure you have the following before setting up the bot:
- **Node.js** (v16.x or higher) → [Download](https://nodejs.org/)
- **Two Steam Accounts** with:
  - Steam Guard enabled (Mobile Authenticator required)
  - Trade URLs ([Guide](https://support.steampowered.com/kb_article.php?ref=1047-dujk-8014))
  - `sharedSecret` & `identitySecret` ([Guide](https://github.com/DoctorMcKay/node-steam-totp#how-to-get-a-shared-secret))
- **Basic Command Line Knowledge**
 - **At least 1 tradeable Scrap Metal in TF2 inventory!**

## Installation
### 1. Clone or Download the Repository
- **Clone with Git**:
  ```bash
  git clone https://github.com/AkkayaKaan/kaans-steam-trade-farming-bot.git
  cd kaans-steam-trade-farming-bot
  ```
- **Download ZIP**: Extract the ZIP file from GitHub.

### 2. Install Dependencies
- **Windows (Batch File)**:
  ```bash
  install.bat
  ```
- **Manual (Any OS)**:
  ```bash
  npm install
  ```

### 3. Configure the Bot
Edit `config.json` with your Steam account details (see [Configuration](#configuration)).

## Configuration
Modify `config.json`:
```json
{
  "account1": {
    "username": "your_account1_username",
    "password": "your_account1_password",
    "sharedSecret": "your_account1_shared_secret",
    "identitySecret": "your_account1_identity_secret",
    "tradeUrl": "your_account1_trade_url"
  },
  "account2": {
    "username": "your_account2_username",
    "password": "your_account2_password",
    "sharedSecret": "your_account2_shared_secret",
    "identitySecret": "your_account2_identity_secret",
    "tradeUrl": "your_account2_trade_url"
  },
  "item": {
    "appid": 440,
    "contextid": "2"
  }
}
```

## Usage
### Start the Bot
- **Windows**:
  ```bash
  start.bat
  ```
- **Any OS**:
  ```bash
  node index.js
  ```

## How It Works
1. **Login**: Authenticates both accounts via 2FA.
2. **Trade Initiation**: Sends trade offers.
3. **Confirmation**: Trades are confirmed.
4. **Auto-Accept**: Trades are accepted.
5. **Repeat**: The cycle continues indefinitely.

## Troubleshooting
- **Login Fails**:
  - Ensure Steam Guard secrets are correct.
- **Trade Issues**:
  - Confirm both accounts have the required item.
- **Rate Limit Errors**:
  - Steam may have temporarily blocked logins; wait 10 minutes.

## Author
- **Kaan Akkaya**
- GitHub: [github.com/AkkayaKaan](https://github.com/AkkayaKaan)

Happy Trading & Farming! 🚀
