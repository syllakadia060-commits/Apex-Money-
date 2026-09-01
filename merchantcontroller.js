 const { readState, writeState } = require('./database'); 
const { v4: uuidv4 } = require('uuid');

/**
 * CORE OPERATION: Processes real-time merchant QR invoice settlements
 */
async function handleQrMerchantPayment(req, res) {
    const idempotencyKey = req.header('X-Idempotency-Key');
    const { merchant_id, amount_gnf } = req.body;
    const clientUser = req.actor; // Injected securely by your validation middleware layers

    if (!idempotencyKey || !merchant_id || !amount_gnf || amount_gnf <= 0) {
        return res.status(400).json({ error: "Invalid transaction payload or missing idempotency tracking configurations." });
    }

    const state = readState();
    const parsedAmount = parseFloat(amount_gnf);
    
    // Fee Strategy: 0.5% platform commission deducted from merchant receipt payout
    const merchantFee = parsedAmount * 0.005; 
    const netMerchantAmount = parsedAmount - merchantFee;

    // Verify consumer liquidity bounds
    if (state.accounts[clientUser.id].balance < parsedAmount) {
        return res.status(400).json({ error: "Insufficient account balance to authorize merchant payment." });
    }

    // Verify destination validity
    if (!state.accounts[merchant_id]) { 
        return res.status(404).json({ error: "Target merchant service entity is not recognized on our network." });
    }

    // Process balances safely using atomic row modification steps
    state.accounts[clientUser.id].balance -= parsedAmount;
    state.accounts[merchant_id].balance += netMerchantAmount;
    state.accounts["OWNER_MAIN"].balance += merchantFee; // Platform owner profit cut
    state.system_stats.total_commissions_earned_gnf += merchantFee;

    const txId = "QR-PAY-" + uuidv4().substring(0, 8).toUpperCase();
    const invoiceLog = {
        tx_id: txId,
        client_id: clientUser.id,
        merchant_id: merchant_id,
        gross_amount: parsedAmount,
        merchant_fee: merchantFee,
        net_credited: netMerchantAmount,
        date: new Date().toISOString()
    };

    state.ledger.push(invoiceLog);
    state.idempotency_keys.push(idempotencyKey);
    writeState(state);

    return res.status(200).json({
        message: "Merchant transaction successfully committed.",
        receipt: invoiceLog,
        remaining_balance: state.accounts[clientUser.id].balance
    });
}

module.exports = { handleQrMerchantPayment };
