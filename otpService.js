const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios'); // For invoking physical telecom network APIs

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class OtpService {
    /**
     * Generates a structurally secure 6-digit numerical validation key
     */
    generateNumericOtp() {
        return Math.floor(100000 + crypto.randomInt(900000)).toString();
    }

    /**
     * Commits the unique key state to database memory and triggers telecom pipelines
     */
    async sendVerificationOtp(phoneNumber) {
        const otp = this.generateNumericOtp();
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // Token lifetime: 5 Minutes

        // 1. Transactional Upsert - Clear past records and insert clean tracking data
        const query = `
            INSERT INTO phone_verifications (phone_number, otp_code, expires_at, is_verified, attempts)
            VALUES ($1, $2, $3, FALSE, 0)
            ON CONFLICT (phone_number) 
            DO UPDATE SET otp_code = $2, expires_at = $3, is_verified = FALSE, attempts = 0;
        `;
        await pool.query(query, [phoneNumber, otp, expiryTime]);

        // 2. Format the customer messaging copy
        const smsMessage = `[Apex Money] Your security code is: ${otp}. Never share this code with anyone. Valid for 5 min.`;
        
        if (process.env.NODE_ENV === 'production') {
            // Production execution path hitting external payment/sms gateway integrations
            try {
                await axios.post(process.env.SMS_GATEWAY_URL, {
                    to: phoneNumber,
                    message: smsMessage,
                    auth_key: process.env.SMS_API_KEY
                });
            } catch (smsError) {
                console.error("Critical Telecom Routing Exception:", smsError.message);
                throw new Error("Could not deliver downstream verification parameters at this time.");
            }
        } else {
            // Local Sandbox/Development: Print output straight to terminal logs for easy access
            console.log(`\n📱 [SMS SIMULATOR -> ${phoneNumber}]: ${smsMessage}\n`);
        }

        return { success: true, message: "Security token successfully dispatched." };
    }

    /**
     * Validates client submission blocks while enforcing strict fraud thresholds
     */
    async verifyUserOtp(phoneNumber, submittedOtp) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Pull current tracking row state from database memory
            const res = await client.query('SELECT * FROM phone_verifications WHERE phone_number = $1', [phoneNumber]);
            if (res.rows.length === 0) {
                throw new Error("No active verification sequence initiated for this destination identifier.");
            }

            const record = res.rows[0];

            // Anti-Brute Force Rule: Block access if the client misses three times in a row
            if (record.attempts >= 3) {
                throw new Error("Max validation limit breached. Please request a fresh security code.");
            }

            // 2. Validate Expiration Bounds
            if (new Date() > new Date(record.expires_at)) {
                throw new Error("The submitted validation window has expired. Please try again.");
            }

            // 3. Match Input Values
            if (record.otp_code !== submittedOtp) {
                // Increment fail counter safely inside the isolated session state
                await client.query('UPDATE phone_verifications SET attempts = attempts + 1 WHERE phone_number = $1', [phoneNumber]);
                await client.query('COMMIT');
                throw new Error("Invalid security verification credentials.");
            }

            // 4. Verification Successful: Wipe token from memory to prevent reuse attacks
            await client.query('UPDATE phone_verifications SET is_verified = TRUE, otp_code = \'\' WHERE phone_number = $1', [phoneNumber]);
            
            await client.query('COMMIT');
            return { success: true, message: "Phone network identity validated." };

        } catch (error) {
            await client.query('ROLLBACK');
            return { success: false, reason: error.message };
        } finally {
            client.release();
        }
    }
}

module.exports = new OtpService();
