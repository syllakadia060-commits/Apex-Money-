const express = require('express');
const { authenticateAndAuthorize } = require('./middleware');
const controllers = require('./controllers');

const app = express();
app.use(express.json());

// PORTAL ENTRY 1: AGENT SPACE (Requires X-Caller-ID header pointing to an AGENT)
app.post('/api/portal/agent/cash-in', 
    authenticateAndAuthorize('AGENT'), 
    controllers.handleAgentCashIn
);

// PORTAL ENTRY 2: USER INTERFACE (Requires X-Caller-ID header pointing to a USER)
app.post('/api/portal/user/transfer', 
    authenticateAndAuthorize('USER'), 
    controllers.handleUserTransfer
);

// PORTAL ENTRY 3: OWNER PLATFORM ADMIN (Requires X-Caller-ID header pointing to the OWNER)
app.get('/api/portal/owner/audit-summary', 
    authenticateAndAuthorize('OWNER'), 
    controllers.handleOwnerAuditReport
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(` Apex Financial System Server Active Across Multi-Role Portals  `);
    console.log(` Target Environment Port: ${PORT}                             `);
    console.log(`================================================================`);
});
 const otpService = require('./otpService');

/**
 * ENTRY ROUTE 1: User requests an access passcode. Server sends an SMS verification code.
 */
app.post('/api/auth/request-otp', async (req, res) => {
    const { phone_number } = req.body;

    // Validate international format strings specifically matching the Guinean area code routing rules
    if (!phone_number || !phone_number.startsWith('+224')) {
        return res.status(400).json({ error: "Invalid identity configuration. Target string must map to Guinea (+224)." });
    }

    try {
        const result = await otpService.sendVerificationOtp(phone_number);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * ENTRY ROUTE 2: User submits the 6 digits from their SMS to unlock their wallet session.
 */
app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone_number, otp_code } = req.body;

    if (!phone_number || !otp_code) {
        return res.status(400).json({ error: "Missing required core payload verification properties." });
    }

    const verification = await otpService.verifyUserOtp(phone_number, otp_code);

    if (!verification.success) {
        return res.status(422).json({ error: verification.reason });
    }

    // Success path: Generate your live encrypted access sessions (e.g., JWT token payloads)
    return res.status(200).json({
        message: "Authorization clearance confirmed.",
        session_token: "MOCK_JWT_SECURITY_TOKEN_XYZ_123"
    });
});
 const { Pool } = require('pg');
const axios = require('axios'); // For sending immediate administrative warning flags

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class ReconciliationEngine {
    /**
     * Executes a complete system audit scan 
     */
    async executeMidnightAudit() {
        const client = await pool.connect();
        console.log(`[${new Date().toISOString()}] 🔍 Starting Automated Daily Reconciliation...`);

        try {
            await client.query('BEGIN');

            // 1. Calculate total liabilities (sum of all digital money currently resting in user and agent wallets)
            const balanceScan = await client.query('SELECT SUM(balance_gnf) as total_float FROM accounts WHERE id != \'OWNER_MAIN\'');
            const totalUserFloat = parseFloat(balanceScan.rows[0].total_float || 0);

            // 2. Calculate actual transaction volumes from the immutable ledger logs for today
            const ledgerScan = await client.query(`
                SELECT 
                    COALESCE(SUM(principal_amount), 0) as total_volume,
                    COALESCE(SUM(fee_charged), 0) as total_fees 
                FROM ledger 
                WHERE timestamp >= CURRENT_DATE AND timestamp < CURRENT_DATE + INTERVAL '1 day'
            `);
            const totalFeesEarned = parseFloat(ledgerScan.rows[0].total_fees);

            // 3. Fetch verification balance statement from your partner bank escrow account API
            // In development, we simulate a perfect bank match
            let actualBankEscrowBalance = totalUserFloat; 

            if (process.env.NODE_ENV === 'production') {
                try {
                    const bankResponse = await axios.get(process.env.BANK_ESCROW_API_URL, {
                        headers: { 'Authorization': `Bearer ${process.env.BANK_API_SECRET}` }
                    });
                    actualBankEscrowBalance = parseFloat(bankResponse.data.cleared_balance);
                } catch (bankError) {
                    console.error("🚨 Escrow Bank API unreachable during nightly reconciliation hook.");
                    actualBankEscrowBalance = -1; // Trigger discrepancy safety loop if bank is offline
                }
            }

            // 4. Run the validation matching math equation
            const discrepancy = actualBankEscrowBalance - totalUserFloat;
            const auditStatus = (discrepancy === 0) ? 'BALANCED' : 'DISCREPANCY_ALERT';

            // 5. Save the audit record permanently to the tracking log tables
            await client.query(`
                INSERT INTO daily_reconciliation_logs (total_system_float, total_platform_fees, unreconciled_discrepancy, status)
                VALUES ($1, $2, $3, $4)
            `, [totalUserFloat, totalFeesEarned, discrepancy, auditStatus]);

            await client.query('COMMIT');
            console.log(`[System Audit Result]: ${auditStatus}. Discrepancy: ${discrepancy} GNF.`);

            // 🚨 CRITICAL FRAUD ALARM: Instantly notify administrators if money doesn't match
            if (auditStatus === 'DISCREPANCY_ALERT') {
                await this.triggerEmergencyAdminAlert(discrepancy, totalUserFloat, actualBankEscrowBalance);
            }

            return { success: true, status: auditStatus };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ Nightly audit process aborted due to error:", error.message);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    /**
     * Dispatches immediate high-priority SMS/Slack warnings to system admins
     */
    async triggerEmergencyAdminAlert(gap, expected, found) {
        console.error(`🚨 EMERGENCY RECONCILIATION FAULT: Expected ${expected} GNF, but Bank holds ${found} GNF!`);
        // Add production emergency alert hooks here (e.g., automated PagerDuty, WhatsApp API, or internal Slack webhooks)
    }
}

module.exports = new ReconciliationEngine();
