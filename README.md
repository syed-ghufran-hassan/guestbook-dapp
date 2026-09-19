# 📖 Stellar Guestbook — Level 2

A multi-wallet, on-chain guestbook dApp built on **Stellar Soroban**. Users connect any Stellar wallet, sign a message, and it is stored on a deployed smart contract on **Stellar Testnet**.

Built for the **Stellar Journey to Mastery — Level 2**.

---

## 🚀 Live Demo

**Live URL:** [https://guestbook-dapp-lvv6.vercel.app/](https://guestbook-dapp-lvv6.vercel.app/)

---

## 🎯 Level 2 Requirements Checklist

| Requirement | Status |
|---|---|
| Multi-wallet integration | ✅ Stellar Wallets Kit (Freighter, xBull, Albedo, Rabet, Lobstr, Hana, WalletConnect) |
| Contract deployed on Testnet | ✅ [`CDAP5B27FKDIPFR2ORS2OCR532VOOWRLBZTHAGXR45467427MNXBRLXC`](https://stellar.expert/explorer/testnet/contract/CDAP5B27FKDIPFR2ORS2OCR532VOOWRLBZTHAGXR45467427MNXBRLXC) |
| Contract called from frontend | ✅ `write_message` invoked via Soroban RPC |
| Transaction status visible | ✅ PENDING → CONFIRMED → SETTLED tracker |
| Real-time event handling | ✅ Soroban `getEvents` polling every 5 s |
| 3 error types handled | ✅ Wallet, network, and transaction errors |
| 10+ meaningful commits | ✅ See git history |

---

## 📸 Screenshot — Wallet Options

The Stellar Wallets Kit modal shows all supported wallets:

![Wallet selection modal](./1.png)

---

## 🔗 Deployed Contract

| Field | Value |
|---|---|
| **Network** | Stellar Testnet |
| **Contract ID** | `CDAP5B27FKDIPFR2ORS2OCR532VOOWRLBZTHAGXR45467427MNXBRLXC` |
| **WASM Hash** | `f3149a8ed93007e7f445f11967098c9ccee88a19afa15358bc979d51debb9c75` |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDAP5B27FKDIPFR2ORS2OCR532VOOWRLBZTHAGXR45467427MNXBRLXC) |

### Contract Interface

```rust
fn write_message(env: Env, author: Address, text: String) -> Result<u32, Error>
fn get_message(env: Env, id: u32) -> Result<Message, Error>
fn total_messages(env: Env) -> u32
```

### Contract Errors

```rust
EmptyMessage = 1     // Returned when text is empty
MessageNotFound = 2  // Returned when id is out of range
```

---

## 🧾 Verified Transaction Hash

A `write_message` call made from the frontend (signed in Freighter):

**TX Hash:** [`1ea081b7f75440a73469fdc2e9d125305e205801fe2653d97bfa5485a8289d81`](https://stellar.expert/explorer/testnet/tx/1ea081b7f75440a73469fdc2e9d125305e205801fe2653d97bfa5485a8289d81)

| Field | Value |
|---|---|
| **Ledger** | 4,756,315 |
| **Status** | ✅ Successful |
| **Fee** | 0.0025807 XLM |
| **Explorer** | [View TX](https://stellar.expert/explorer/testnet/tx/1ea081b7f75440a73469fdc2e9d125305e205801fe2653d97bfa5485a8289d81) |

---

## 🛠 Tech Stack

- **Frontend:** Vite + Vanilla JS
- **Stellar SDK:** `@stellar/stellar-sdk` (Soroban RPC + Horizon)
- **Wallet Kit:** `@creit.tech/stellar-wallets-kit@1.9.5`
- **Smart Contract:** Rust + Soroban SDK `27.0.6`
- **CLI:** Stellar CLI `28.0.0`
- **Deployment:** Vercel

---

## 📦 Setup Instructions

### Prerequisites

- **Node.js** ≥ 20
- **Rust** (latest stable) — for contract rebuild
- **Stellar CLI** ≥ 22 — for deployment
- **Freighter** (or another Stellar wallet) browser extension

### 1. Clone and Install

```bash
git clone https://github.com/syed-ghufran-hassan/guestbook-dapp.git
cd guestbook-dapp
npm install
```

### 2. Run the Frontend

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Connect a Wallet

- Click **Connect Wallet**
- Choose Freighter (or any listed wallet)
- Approve the connection

### 4. Post a Message

- Type a message
- Click **Sign & Post to Contract**
- Sign in your wallet
- Watch the status tracker: **Pending → Confirmed → Settled**
- Entry appears in the list within ~5 seconds

---

## 🧱 Rebuilding the Smart Contract (Optional)

The compiled WASM is committed to this repo. If you want to rebuild and redeploy:

```bash
cd guestbook
stellar contract build

stellar keys generate my-key --network testnet --fund

stellar contract deploy \
  --wasm target/wasm32v1-none/release/guestbook.wasm \
  --source-account my-key \
  --network testnet \
  --alias guestbook
```

Then update `CONTRACT_ID` in `src/main.js`.

---

## 🧪 Testing

### Frontend

```bash
npm run dev
```

Manually verify:

1. Wallet connects → address + balance appear
2. Message posted → status tracker animates
3. Entry appears within 5 s (real-time polling)
4. Reject signature → wallet error shown
5. Disconnect internet → network error shown
6. Send only spaces → contract error `EmptyMessage` shown

### Contract

```bash
cd guestbook
cargo test
```

Expected output:

```
running 2 tests
test test::test_empty_message_rejected - should panic ... ok
test test::test_write_and_read ... ok

test result: ok. 2 passed; 0 failed
```

---

## 🛡 Error Handling

| Error Type | Trigger | UI Message |
|---|---|---|
| **Wallet** | User rejects signature | ❌ Wallet rejected the request... |
| **Network** | Offline or RPC timeout | 🌐 Network error. Check your connection... |
| **Transaction** | Contract returns error code | ⚠️ Contract error: message cannot be empty |

The categorization lives in `categorizeError()` in `src/main.js`.

---

## 📂 Project Structure

```
guestbook-dapp/
├── index.html               # UI shell
├── src/
│   └── main.js              # All dApp logic (wallet, contract, events)
├── 1.png                    # Wallet options screenshot
├── package.json
├── vite.config.js
└── README.md
```

---

## 🌐 Useful Links

- **Live Demo:** [https://guestbook-dapp-lvv6.vercel.app/](https://guestbook-dapp-lvv6.vercel.app/)
- **Stellar Expert (Contract):** [CDAP5B27...MNXBRLXC](https://stellar.expert/explorer/testnet/contract/CDAP5B27FKDIPFR2ORS2OCR532VOOWRLBZTHAGXR45467427MNXBRLXC)
- **Stellar Expert (TX):** [1ea081b7...9d81](https://stellar.expert/explorer/testnet/tx/1ea081b7f75440a73469fdc2e9d125305e205801fe2653d97bfa5485a8289d81)

---

## 📜 License

MIT

---

## 🙌 Acknowledgements

- [Stellar Development Foundation](https://stellar.org/)
- [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
- [Soroban Documentation](https://soroban.stellar.org/)