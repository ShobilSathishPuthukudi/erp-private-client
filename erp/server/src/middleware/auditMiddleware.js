/**
 * Middleware to enforce mandatory remarks for sensitive administrative actions.
 * Ensures that any modification or deletion is accompanied by a justification of at least 50 characters.
 */
export const requireMandatoryRemarks = (req, res, next) => {
    const { remarks } = req.body;
    
    // We only enforce this for PUT and DELETE on financial or sensitive routes
    if (['PUT', 'DELETE'].includes(req.method)) {
        if (!remarks || remarks.length < 50) {
            return res.status(400).json({ 
                error: 'Institutional Audit Violation: A justification of at least 50 characters is mandatory for this action.' 
            });
        }
    }
    
    next();
};
