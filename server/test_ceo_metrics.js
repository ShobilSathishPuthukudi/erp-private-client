import { models } from './src/models/index.js';
import { Op } from 'sequelize';
import sequelize from './src/config/db.js';

async function testMetrics() {
  try {
    const { Department, Student, User, Invoice, Task, Lead, Leave, AuditLog, Program, OrgConfig } = models;
    const restricted = true;
    const deptIds = [86, 87, 88, 89, 90];
    const names = ['academic operations', 'online department admin', 'skill department admin', 'bvoc department admin', 'open school admin'];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const isFinance = false;
    const whereStudent = restricted ? { [Op.or]: [{ deptId: { [Op.in]: deptIds } }, { subDepartmentId: { [Op.in]: deptIds } }] } : {};
    const whereUser = restricted ? { [Op.or]: [{ deptId: { [Op.in]: deptIds } }, { subDepartment: { [Op.in]: names } }] } : {};

    const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
    const taskGrace = parseInt(configs.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
    const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);

    const centerWhere = {
      type: { [Op.in]: ['partner-center', 'partner center', 'partner centers'] },
      status: 'active',
      ...(restricted ? {
        [Op.or]: [
          { id: { [Op.in]: deptIds } },
          { parentId: { [Op.in]: deptIds } },
          ...(deptIds?.length > 0 ? [{ id: { [Op.in]: sequelize.literal(`(SELECT DISTINCT centerId FROM center_programs WHERE subDeptId IN (${deptIds.join(',')}))`) } }] : [])
        ]
      } : {})
    };
    await Department.unscoped().count({ where: centerWhere });

    const univWhere = {
      type: 'universities',
      status: { [Op.in]: ['active', 'staged'] },
      ...(restricted ? {
        [Op.or]: [
          { id: { [Op.in]: deptIds } },
          { parentId: { [Op.in]: deptIds } }
        ]
      } : {})
    };
    await Department.unscoped().count({ where: univWhere });

    await Program.unscoped().count({
      where: { 
        status: 'active',
        ...(restricted ? { subDeptId: { [Op.in]: deptIds } } : {})
      }
    });

    const activeCenters = await Department.unscoped().count({ where: centerWhere });
    const totalStudents = await Student.unscoped().count({ where: whereStudent });
    

    const allInvoices = await Invoice.unscoped().findAll({
      attributes: ['total', 'createdAt'],
      where: { status: 'paid' },
      include: [{
        model: Student.unscoped(),
        as: 'student',
        required: true,
        where: isFinance ? {} : whereStudent
      }]
    });
    
    await Task.unscoped().count({
      where: {
        [Op.or]: [
          { status: 'overdue' },
          { status: { [Op.ne]: 'completed' }, deadline: { [Op.lt]: gracePeriodThreshold } }
        ]
      },
      include: [{
        model: User.unscoped(),
        as: 'assignee',
        required: true,
        where: whereUser
      }]
    });

    await Leave.unscoped().count({
      where: {
        status: { [Op.notIn]: ['approved', 'rejected'] }
      },
      include: [{
        model: User.unscoped(),
        as: 'employee',
        required: true,
        where: whereUser
      }]
    });

    const auditUserIds = restricted ? await User.unscoped().findAll({ 
      where: whereUser, 
      attributes: ['uid'] 
    }).then(users => users.map(u => u.uid)) : [];

    await AuditLog.count({
      where: {
        [Op.or]: [
          { action: { [Op.like]: '%DELETE%' } },
          { action: { [Op.like]: '%UNAUTHORIZED%' } }
        ],
        timestamp: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        ...(restricted ? { userId: { [Op.in]: auditUserIds } } : {})
      }
    });

    console.log('All metrics loaded successfully');
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  }
}
testMetrics();
