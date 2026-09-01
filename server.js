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
