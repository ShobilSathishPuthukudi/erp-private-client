import { models } from '../models/index.js';

/**
 * Log an administrative action to the forensic audit ledger.
 * @param {Object} params - The audit log parameters.
 * @param {string} params.userId - The ID of the user performing the action.
 * @param {string} params.action - The type of action (e.g., CREATE, UPDATE, DELETE).
 * @param {string} params.entity - The target entity (e.g., Student, Invoice).
 * @param {string} params.module - The ERP module (e.g., Finance, Academic).
 * @param {string} [params.details] - Narrative detail of the action.
 * @param {Object} [params.before] - State snapshot before the action.
 * @param {Object} [params.after] - State snapshot after the action.
 * @param {string} [params.remarks] - Mandatory justification for the action.
 * @param {string} [params.ipAddress] - Origin IP of the request.
 */
export const logAction = async ({ 
    userId, 
    action, 
    entity, 
    module, 
    details, 
    before, 
    after, 
    remarks, 
    ipAddress 
}) => {
    try {
        const { AuditLog } = models;
        await AuditLog.create({
            userId,
            action,
            entity,
            module,
            before,
            after,
            remarks: remarks || details, // Fallback if remarks not explicitly provided
            ipAddress,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Audit Logging Failure:', error);
        // We do not throw here to prevent auditing failure from breaking the main transaction,
        // but in a high-security environment, we might want to block the action if logging fails.
    }
};
