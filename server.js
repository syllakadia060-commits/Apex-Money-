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
