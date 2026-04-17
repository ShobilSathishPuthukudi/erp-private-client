import { Op } from 'sequelize';
import { SINGLETON_ROLES } from '../../config/rbac.js';

/**
 * Institutional Governance: Authority Succession
 * Ensures that for singleton roles, only one active identity exists.
 * Any predecessor is automatically moved to 'suspended' state.
 * 
 * @param {Object} models - Sequelize models object containing User and AuditLog
 * @param {string} role - The role name being assumed
 * @param {string} newUserId - The UID of the user assuming the role
 * @param {Object} transaction - Sequelize transaction object
 * @param {string} adminUid - The UID of the administrator performing the action
 */
export const handleAuthoritySuccession = async (models, role, newUserId, transaction, adminUid = 'SYSTEM') => {
  const { User, AuditLog } = models;
  
  // Normalize role comparison
  const roleLower = role?.toLowerCase()?.trim();
  const singletonLowers = SINGLETON_ROLES.map(r => r.toLowerCase());
  
  // If not a singleton role, skip enforcement
  if (!singletonLowers.includes(roleLower)) return;

  const predecessors = await User.findAll({
    where: { 
      role, 
      status: 'active', 
      uid: { [Op.ne]: newUserId } 
    },
    transaction
  });

  if (predecessors.length > 0) {
    console.log(`[GOVERNANCE] Authority Succession for '${role}': Suspending ${predecessors.length} identity/identities.`);
    
    await User.update(
      { status: 'suspended' },
      { 
        where: { 
          role, 
          status: 'active', 
          uid: { [Op.ne]: newUserId } 
        }, 
        transaction 
      }
    );

    for (const p of predecessors) {
      await AuditLog.create({
        userId: adminUid,
        action: 'AUTHORITY_SUCCESSION',
        entity: `User: ${p.uid}`,
        module: 'GOVERNANCE',
        remarks: `Account suspended automatically as role '${role}' was assumed by UID: ${newUserId}`,
        timestamp: new Date()
      }, { transaction });
    }
  }
};
