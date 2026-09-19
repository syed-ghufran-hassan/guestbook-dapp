import {
    StellarWalletsKit,
    WalletNetwork,
    allowAllModules,
    FREIGHTER_ID
} from '@creit.tech/stellar-wallets-kit';
import * as StellarSdk from '@stellar/stellar-sdk';

console.log('🚀 Stellar Guestbook Level 2 loaded');

// ================== CONFIG ==================
const CONTRACT_ID = 'CDAP5B27FKDIPFR2ORS2OCR532VOOWRLBZTHAGXR45467427MNXBRLXC';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

// ================== WALLET KIT ==================
const kit = new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: allowAllModules()
});

// ================== STATE ==================
let publicKey = null;
let isLoading = false;
let lastEventLedger = 0;
let eventPollHandle = null;

document.getElementById('contractBadge').textContent =
    `${CONTRACT_ID.slice(0, 8)}…${CONTRACT_ID.slice(-8)}`;

// ================== DOM ==================
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const fundBtn = document.getElementById('fundBtn');
const submitBtn = document.getElementById('submitBtn');
const messageInput = document.getElementById('messageInput');
const messageForm = document.getElementById('messageForm');
const connectContainer = document.getElementById('walletConnectContainer');
const infoContainer = document.getElementById('walletInfoContainer');
const publicKeyDisplay = document.getElementById('publicKeyDisplay');
const balanceDisplay = document.getElementById('balanceDisplay');
const txFeedback = document.getElementById('txFeedback');
const entriesContainer = document.getElementById('entriesContainer');
const refreshBtn = document.getElementById('refreshBtn');
const txStatusTracker = document.getElementById('txStatusTracker');

// ================== HELPERS ==================

// ---- 3 ERROR TYPES ----
function categorizeError(err) {
    const raw = (err && (err.message || err.toString())) || 'Unknown error';
    const msg = raw.toLowerCase();

    // 1. Wallet errors
    if (msg.includes('user rejected') || msg.includes('rejected') ||
        msg.includes('denied') || msg.includes('cancel') ||
        msg.includes('closed')) {
        return { type: 'wallet', message: '❌ Wallet rejected the request. Please try again and approve in your wallet.' };
    }
    // 2. Network errors
    if (msg.includes('network') || msg.includes('fetch') ||
        msg.includes('timeout') || msg.includes('offline') ||
        msg.includes('failed to load') || msg.includes('connection')) {
        return { type: 'network', message: '🌐 Network error. Check your connection and try again.' };
    }
    // 3. Contract / transaction errors
    if (msg.includes('error(contract') || msg.includes('hosterror')) {
        if (msg.includes('#1')) return { type: 'transaction', message: '⚠️ Contract error: message cannot be empty.' };
        if (msg.includes('#2')) return { type: 'transaction', message: '⚠️ Contract error: message not found.' };
        return { type: 'transaction', message: `⚠️ Contract error: ${raw}` };
    }
    return { type: 'transaction', message: `❌ Transaction failed: ${raw}` };
}

function setLoading(state) {
    isLoading = state;
    connectBtn.disabled = state;
    submitBtn.disabled = state || !publicKey;
    messageInput.disabled = state || !publicKey;
    if (state) {
        connectBtn.innerHTML = '<span class="loading-spinner"></span> Working…';
    } else {
        connectBtn.innerHTML = '🔗 Connect Wallet';
    }
}

function showFeedback(type, content) {
    txFeedback.style.display = 'block';
    txFeedback.className = `tx-feedback ${type}`;
    txFeedback.innerHTML = content;
}
function hideFeedback() {
    txFeedback.style.display = 'none';
    txFeedback.innerHTML = '';
}

function showStatusTracker() { txStatusTracker.style.display = 'flex'; }
function hideStatusTracker() {
    txStatusTracker.style.display = 'none';
    ['stepPending','stepConfirmed','stepSettled','stepFailed'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('active', 'failed');
        if (id === 'stepFailed') el.style.display = 'none';
    });
}
function setStatus(stage) {
    const steps = { pending: 'stepPending', confirmed: 'stepConfirmed', settled: 'stepSettled' };
    if (stage === 'failed') {
        document.getElementById('stepFailed').style.display = 'flex';
        document.getElementById('stepFailed').classList.add('failed');
        return;
    }
    const order = ['stepPending', 'stepConfirmed', 'stepSettled'];
    const currentIdx = order.indexOf(steps[stage]);
    order.forEach((id, i) => {
        document.getElementById(id).classList.toggle('active', i <= currentIdx);
    });
}

function updateUI(key, bal) {
    if (key) {
        connectContainer.style.display = 'none';
        infoContainer.style.display = 'block';
        publicKeyDisplay.textContent = `${key.slice(0, 6)}…${key.slice(-6)}`;
        balanceDisplay.textContent = bal || '0.0000';
        submitBtn.disabled = false;
        messageInput.disabled = false;
        fundBtn.style.display = (bal && bal.includes('Unfunded')) ? 'inline-block' : 'none';
    } else {
        connectContainer.style.display = 'block';
        infoContainer.style.display = 'none';
        publicKeyDisplay.textContent = '---';
        balanceDisplay.textContent = '0.0000';
        submitBtn.disabled = true;
        messageInput.disabled = true;
        fundBtn.style.display = 'none';
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ================== WALLET ==================
async function connectWallet() {
    return new Promise((resolve, reject) => {
        kit.openModal({
            onWalletSelected: async (option) => {
                try {
                    kit.setWallet(option.id);
                    const { address } = await kit.getAddress();
                    resolve(address);
                } catch (err) { reject(err); }
            },
            onClosed: () => reject(new Error('Wallet selection closed'))
        });
    });
}

async function fetchBalance(pubKey) {
    try {
        const server = new StellarSdk.Horizon.Server(HORIZON_URL);
        const account = await server.loadAccount(pubKey);
        const xlm = account.balances.find(b => b.asset_type === 'native');
        return xlm ? parseFloat(xlm.balance).toFixed(4) : '0.0000';
    } catch (err) {
        if (err.response?.status === 404) return '0.0000 (Unfunded)';
        const cat = categorizeError(err);
        throw new Error(cat.message);
    }
}

async function fundWithFriendbot(pubKey) {
    const res = await fetch(`https://friendbot.stellar.org/?addr=${pubKey}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// ================== SOROBAN CONTRACT ==================
const rpcServer = new StellarSdk.rpc.Server(RPC_URL);

async function simulateRead(method, ...args) {
    const source = publicKey || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHFQ';
    const account = new StellarSdk.Account(source, '0');
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

    const sim = await rpcServer.simulateTransaction(tx);
    if (sim.error) throw new Error(`Simulation failed: ${sim.error}`);
    return StellarSdk.scValToNative(sim.result.retval);
}

async function readTotalMessages() {
    return await simulateRead('total_messages');
}

async function readMessage(id) {
    return await simulateRead('get_message',
        StellarSdk.nativeToScVal(id, { type: 'u32' })
    );
}

async function postGuestbookEntry(sourcePubKey, message) {
    try {
        setStatus('pending');

        const account = await rpcServer.getAccount(sourcePubKey);

        const contract = new StellarSdk.Contract(CONTRACT_ID);
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(contract.call(
                'write_message',
                StellarSdk.nativeToScVal(sourcePubKey, { type: 'address' }),
                StellarSdk.nativeToScVal(message, { type: 'string' })
            ))
            .setTimeout(30)
            .build();

        const sim = await rpcServer.simulateTransaction(tx);
        if (sim.error) {
            throw new Error(`Simulation error: ${sim.error}`);
        }
        const preparedTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();

        const { signedTxXdr } = await kit.signTransaction(preparedTx.toXDR(), {
            networkPassphrase: NETWORK_PASSPHRASE
        });
        setStatus('confirmed');

        const sendResult = await rpcServer.sendTransaction(
            StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
        );

        if (sendResult.status === 'ERROR') {
            setStatus('failed');
            throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult || sendResult)}`);
        }

        const hash = sendResult.hash;

        let attempts = 0;
        const maxAttempts = 30;
        return await new Promise((resolve) => {
            const poll = setInterval(async () => {
                attempts++;
                try {
                    const txInfo = await rpcServer.getTransaction(hash);
                    if (txInfo.status === 'SUCCESS') {
                        clearInterval(poll);
                        setStatus('settled');
                        resolve({ success: true, hash, message });
                    } else if (txInfo.status === 'FAILED') {
                        clearInterval(poll);
                        setStatus('failed');
                        resolve({ success: false, error: 'Transaction failed on-chain.' });
                    }
                } catch (e) { /* still pending */ }

                if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    setStatus('failed');
                    resolve({ success: false, error: 'Confirmation timeout. Check the explorer.' });
                }
            }, 2000);
        });
    } catch (err) {
        setStatus('failed');
        const cat = categorizeError(err);
        return { success: false, error: cat.message };
    }
}

// ================== READ ENTRIES ==================
async function fetchGuestbookEntries(limit = 10) {
    try {
        const total = await readTotalMessages();
        if (total === 0) return [];

        const count = Math.min(total, limit);
        const start = total - count;

        const reads = [];
        for (let i = 0; i < count; i++) {
            reads.push(readMessage(start + i));
        }
        const results = await Promise.all(reads);

        return results
            .map((m, idx) => ({
                message: m.text,
                from: m.author,
                ledger: m.ledger,
                id: start + idx,
            }))
            .reverse();
    } catch (err) {
        console.error('fetchGuestbookEntries error:', err);
        return [];
    }
}

function renderEntries(entries) {
    if (!entries || !entries.length) {
        entriesContainer.innerHTML = '<p class="empty-msg">No entries yet. Be the first to sign! 🚀</p>';
        return;
    }
    let html = '<ul class="entries-list">';
    for (const e of entries) {
        const from = e.from ? `${e.from.slice(0,6)}…${e.from.slice(-6)}` : 'unknown';
        const msg = escapeHtml(e.message || '');
        html += `
            <li class="entry-item">
                <p class="entry-message">“${msg}”</p>
                <div class="entry-meta">
                    <span>From: ${from}</span>
                    <span>• Ledger ${e.ledger || '?'}</span>
                </div>
            </li>
        `;
    }
    html += '</ul>';
    entriesContainer.innerHTML = html;
}

async function loadEntries() {
    try {
        const entries = await fetchGuestbookEntries(10);
        renderEntries(entries);
    } catch (err) {
        console.error('loadEntries error:', err);
        entriesContainer.innerHTML = '<p class="empty-msg">Failed to load entries. Please refresh.</p>';
    }
}

// ================== REAL-TIME EVENTS ==================
async function pollEvents() {
    try {
        if (lastEventLedger === 0) {
            const latest = await rpcServer.getLatestLedger();
            lastEventLedger = latest.sequence;
            return;
        }
        const result = await rpcServer.getEvents({
            startLedger: lastEventLedger,
            filters: [{ type: 'contract', contractIds: [CONTRACT_ID] }],
        });
        if (result.events && result.events.length > 0) {
            console.log('📡 New contract events:', result.events.length);
            lastEventLedger = result.latestLedger;
            await loadEntries();
        }
    } catch (e) {
        console.warn('Event poll error:', e.message);
    }
}

function startEventStream() {
    if (eventPollHandle) return;
    pollEvents();
    eventPollHandle = setInterval(pollEvents, 5000);
}

// ================== EVENT HANDLERS ==================
connectBtn.addEventListener('click', async function() {
    setLoading(true);
    hideFeedback();
    try {
        const key = await connectWallet();
        publicKey = key;
        const balance = await fetchBalance(key);
        updateUI(key, balance);
        await loadEntries();
        startEventStream();
        showFeedback('success', '✅ Wallet connected successfully!');
    } catch (err) {
        const cat = categorizeError(err);
        showFeedback('error', cat.message);
    } finally {
        setLoading(false);
    }
});

disconnectBtn.addEventListener('click', async function() {
    try { if (kit.disconnect) await kit.disconnect(); } catch (e) {}
    publicKey = null;
    updateUI(null, '0.0000');
    hideFeedback();
    hideStatusTracker();
    if (eventPollHandle) { clearInterval(eventPollHandle); eventPollHandle = null; }
    showFeedback('success', '✅ Disconnected successfully');
});

fundBtn.addEventListener('click', async function() {
    if (!publicKey) return;
    setLoading(true);
    hideFeedback();
    try {
        await fundWithFriendbot(publicKey);
        showFeedback('success', '✅ Account funded with 10,000 XLM (Testnet)!');
        setTimeout(async () => {
            const bal = await fetchBalance(publicKey);
            updateUI(publicKey, bal);
            setLoading(false);
        }, 2000);
    } catch (err) {
        const cat = categorizeError(err);
        showFeedback('error', cat.message);
        setLoading(false);
    }
});

messageForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!publicKey) {
        showFeedback('error', 'Connect your wallet first.');
        return;
    }
    const msg = messageInput.value.trim();
    if (!msg) {
        showFeedback('error', 'Please enter a message.');
        return;
    }
    setLoading(true);
    hideFeedback();
    hideStatusTracker();
    showStatusTracker();

    try {
        const result = await postGuestbookEntry(publicKey, msg);
        if (result.success) {
            showFeedback(
                'success',
                `<p>✅ Message stored on-chain!</p>
                 <a href="https://stellar.expert/explorer/testnet/tx/${result.hash}" target="_blank" rel="noreferrer">
                     🔗 View Transaction: ${result.hash.slice(0,16)}…
                 </a>`
            );
            messageInput.value = '';
            const bal = await fetchBalance(publicKey);
            updateUI(publicKey, bal);
            await loadEntries();
        } else {
            showFeedback('error', result.error);
        }
    } catch (err) {
        const cat = categorizeError(err);
        showFeedback('error', cat.message);
    } finally {
        setLoading(false);
    }
});

refreshBtn.addEventListener('click', async function() {
    entriesContainer.innerHTML = '<p class="empty-msg">Refreshing…</p>';
    await loadEntries();
});

// ================== INIT ==================
(async function init() {
    await loadEntries();
    startEventStream();
    try {
        const { address } = await kit.getAddress();
        if (address && address.length > 0) {
            publicKey = address;
            const bal = await fetchBalance(address);
            updateUI(address, bal);
            showFeedback('success', '✅ Wallet already connected!');
        }
    } catch (e) { /* not connected */ }
})();