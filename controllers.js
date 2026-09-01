const { readState, writeState } = require('./database');
const { v4: uuidv4 } = require('uuid');

/**
 * AGENT OPERATION: Cash-In (User hands physical cash to Agent, Agent updates User's digital wallet)
 */
function handleAgentCashIn(req, res) {
    const idempotencyKey = req.header('X-Idempotency-Key');
    const { target_user_phone, amount } = req.body;
    const agent = req.actor;

    if (!idempotencyKey || !target_user_phone || !amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid parameters or missing idempotency tracking configurations." });
    }

    const state = readState();
    if (state.idempotency_keys.includes(idempotencyKey)) {
        return res.status(422).json({ error: "Duplicate transaction reference detected. Request dropped." });
    }

    // Find the recipient user by phone number
    const targetUser = Object.values(state.accounts).find(acc => acc.phone === target_user_phone && acc.role === 'USER');
    if (!targetUser) return res.status(404).json({ error: "Recipient user wallet profile not found in network." });

    if (state.accounts[agent.id].balance < amount) {
        return res.status(400).json({ error: "Agent float balance insufficient to satisfy cash-in requirements." });
    }

    // Process balances safely using double-entry logic
    state.accounts[agent.id].balance -= parseFloat(amount);
    state.accounts[targetUser.id].balance += parseFloat(amount);

    const txId = "CSH-IN-" + uuidv4().substring(0, 8).toUpperCase();
    const ledgerEntry = {
        tx_id: txId,
        type: "CASH_IN",
        agent_id: agent.id,
        user_id: targetUser.id,
        amount: parseFloat(amount),
        timestamp: new Date().toISOString()
    };

    state.ledger.push(ledgerEntry);
    state.idempotency_keys.push(idempotencyKey);
    writeState(state);

    return res.status(200).json({ message: "Cash-In execution successful.", receipt: ledgerEntry, remaining_agent_float: state.accounts[agent.id].balance });
}

/**
 * USER OPERATION: Pay Merchant or P2P Transfer (Applies a 1% network operational fee to Owner)
 */
function handleUserTransfer(req, res) {
    const idempotencyKey = req.header('X-Idempotency-Key');
    const { receiver_phone, amount } = req.body;
    const sender = req.actor;

    if (!idempotencyKey || !receiver_phone || !amount || amount <= 0) {
        return res.status(400).json({ error: "Incomplete transfer parameter parameters." });
    }

    const state = readState();
    const parsedAmount = parseFloat(amount);
    const systemFee = parsedAmount * 0.01; // 1% commission rule
    const totalDeduction = parsedAmount + systemFee;

    if (sender.balance < totalDeduction) {
        return res.status(400).json({ error: `Insufficient funds. Transfer requires ${totalDeduction} GNF (including 1% network fee).` });
    }

    const receiver = Object.values(state.accounts).find(acc => acc.phone === receiver_phone);
    if (!receiver) return res.status(404).json({ error: "Destination target phone profile missing." });

    // Update system balances across three accounts (Sender, Receiver, System Owner Treasury)
    state.accounts[sender.id].balance -= totalDeduction;
    state.accounts[receiver.id].balance += parsedAmount;
    state.accounts["OWNER_MAIN"].balance += systemFee;
    state.system_stats.total_commissions_earned_gnf += systemFee;

    const txId = "P2P-" + uuidv4().substring(0, 8).toUpperCase();
    const log = { tx_id: txId, sender: sender.id, receiver: receiver.id, principal: parsedAmount, fee: systemFee, date: new Date().toISOString() };
    
    state.ledger.push(log);
    state.idempotency_keys.push(idempotencyKey);
    writeState(state);

    return res.status(200).json({ message: "Transfer completed.", tx_details: log });
}

/**
 * OWNER OPERATION: Core System Financial Statement Reporting
 */
function handleOwnerAuditReport(req, res) {
    const state = readState();
    return res.status(200).json({
        system_status: "Operational",
        total_accumulated_fees: state.system_stats,
        total_monetary_velocity_events: state.ledger.length,
        network_nodes: Object.keys(state.accounts).map(key => ({
            id: key,
            role: state.accounts[key].role,
            balance: state.accounts[key].balance
        }))
    });
}

module.exports = { handleAgentCashIn, handleUserTransfer, handleOwnerAuditReport };
