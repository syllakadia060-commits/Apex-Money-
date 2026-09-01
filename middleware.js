 const { readState } = require('./database');

function authenticateAndAuthorize(requiredRole) {
    return (req, res, next) => {
        const callerId = req.header('X-Caller-ID');
        if (!callerId) {
            return res.status(401).json({ error: "Access Denied. Identification header X-Caller-ID is missing." });
        }

        const state = readState();
        const actor = state.accounts[callerId];

        if (!actor) {
            return res.status(403).json({ error: "Access Denied. Account profile not recognized in master ledger." });
        }

        if (actor.role !== requiredRole) {
            return res.status(432).json({ 
                error: `Access Denied. Operation requires ${requiredRole} clearances. Account holds ${actor.role} scope.` 
            });
        }

        req.actor = actor; // Bind actor profiles safely to response lifecycle
        next();
    };
}

module.exports = { authenticateAndAuthorize };
