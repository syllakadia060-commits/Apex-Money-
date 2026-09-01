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
