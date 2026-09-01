 const fs = require('fs');
const dbFile = './apex_money_ledger.json';

if (!fs.existsSync(dbFile)) {
    const defaultData = {
        system_stats: { total_commissions_earned_gnf: 0 },
        accounts: {
            "OWNER_MAIN": { id: "OWNER_MAIN", phone: "+224620000000", role: "OWNER", balance: 500000000 }, // System Treasury
            "AGENT_01":   { id: "AGENT_01",   phone: "+224629999999", role: "AGENT", balance: 10000000 },  // Conakry Agent Kiosk
            "USER_01":    { id: "USER_01",    phone: "+224621111111", role: "USER",  balance: 250000 }     // End User Wallet
        },
        ledger: [],
        idempotency_keys: []
    };
    fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2));
}

function readState() { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
function writeState(data) { fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); }

module.exports = { readState, writeState };
