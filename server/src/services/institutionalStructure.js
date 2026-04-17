import { Op } from 'sequelize';
import {
  CORE_DEPARTMENTS,
  INSTITUTIONAL_ROLES,
  SEEDED_ADMIN_ROLE_NAMES,
  SUB_DEPARTMENTS,
  getDepartmentNameAliases,
  getSubDepartmentNameAliases,
} from '../config/institutionalStructure.js';

export const syncInstitutionalStructure = async (models) => {
  const { Department, Role } = models;

  const coreDepartmentMap = new Map();

  for (const departmentDef of CORE_DEPARTMENTS) {
    const existingDepartment = await Department.findOne({
      where: {
        name: { [Op.in]: getDepartmentNameAliases(departmentDef.name) },
        parentId: null,
      },
      order: [['id', 'ASC']],
    });

    const department = existingDepartment || await Department.create({
      name: departmentDef.name,
      shortName: departmentDef.shortName,
      type: 'departments',
      status: 'active',
      description: departmentDef.description,
      metadata: { seeded: true, seedKey: departmentDef.key, departmentClass: 'core' }
    });

    await department.update({
      shortName: departmentDef.shortName,
      type: 'departments',
      status: department.status === 'inactive' ? 'inactive' : 'active',
      description: departmentDef.description,
      parentId: null,
      metadata: { ...(department.metadata || {}), seeded: true, seedKey: departmentDef.key, departmentClass: 'core' }
    });

    coreDepartmentMap.set(departmentDef.key, department);
  }

  for (const subDepartmentDef of SUB_DEPARTMENTS) {
    const parent = coreDepartmentMap.get(subDepartmentDef.parentKey);
    if (!parent) continue;

    const existingSubDepartment = await Department.findOne({
      where: {
        name: { [Op.in]: getSubDepartmentNameAliases(subDepartmentDef.name) },
        [Op.or]: [
          { parentId: parent.id },
          { parentId: null }
        ]
      },
      order: [['id', 'ASC']],
    });

    const subDepartment = existingSubDepartment || await Department.create({
      name: subDepartmentDef.name,
      shortName: subDepartmentDef.shortName,
      type: 'sub-departments',
      parentId: parent.id,
      status: 'active',
      description: subDepartmentDef.description,
      metadata: { seeded: true, seedKey: subDepartmentDef.key, departmentClass: 'sub' }
    });

    await subDepartment.update({
      shortName: subDepartmentDef.shortName,
      type: 'sub-departments',
      parentId: parent.id,
      status: subDepartment.status === 'inactive' ? 'inactive' : 'active',
      description: subDepartmentDef.description,
      metadata: { ...(subDepartment.metadata || {}), seeded: true, seedKey: subDepartmentDef.key, departmentClass: 'sub' }
    });
  }

  for (const roleDef of INSTITUTIONAL_ROLES) {
    const [role] = await Role.findOrCreate({
      where: { name: roleDef.name },
      defaults: {
        name: roleDef.name,
        description: roleDef.description,
        isCustom: false,
        isSeeded: true,
        isAudited: true,
        status: 'active',
        scopeType: roleDef.scopeType,
        isAdminEligible: roleDef.isAdminEligible
      }
    });

    await role.update({
      description: roleDef.description,
      isCustom: false,
      isSeeded: true,
      isAudited: true,
      status: 'active',
      scopeType: roleDef.scopeType,
      isAdminEligible: roleDef.isAdminEligible
    });
  }

  for (const departmentDef of CORE_DEPARTMENTS) {
    const department = coreDepartmentMap.get(departmentDef.key);
    if (!department) continue;

    const [role] = await Role.findOrCreate({
      where: { name: departmentDef.adminRoleName },
      defaults: {
        name: departmentDef.adminRoleName,
        description: `${departmentDef.name} department administrator.`,
        department: departmentDef.name,
        isCustom: false,
        isSeeded: true,
        isAudited: true,
        status: department.status === 'inactive' ? 'inactive' : 'active',
        scopeType: 'core_department',
        scopeDepartmentId: department.id,
        isAdminEligible: true
      }
    });

    await role.update({
      description: `${departmentDef.name} department administrator.`,
      department: departmentDef.name,
      isCustom: false,
      isSeeded: true,
      isAudited: true,
      status: department.status === 'inactive' ? 'inactive' : 'active',
      scopeType: 'core_department',
      scopeDepartmentId: department.id,
      scopeSubDepartment: null,
      isAdminEligible: true
    });
  }

  for (const subDepartmentDef of SUB_DEPARTMENTS) {
    const parent = coreDepartmentMap.get(subDepartmentDef.parentKey);
    if (!parent) continue;

    const [role] = await Role.findOrCreate({
      where: { name: subDepartmentDef.adminRoleName },
      defaults: {
        name: subDepartmentDef.adminRoleName,
        description: `${subDepartmentDef.name} unit administrator under Academic Operations.`,
        department: parent.name,
        isCustom: false,
        isSeeded: true,
        isAudited: true,
        status: 'active',
        scopeType: 'sub_department',
        scopeDepartmentId: parent.id,
        scopeSubDepartment: subDepartmentDef.name,
        isAdminEligible: true
      }
    });

    await role.update({
      description: `${subDepartmentDef.name} unit administrator under Academic Operations.`,
      department: parent.name,
      isCustom: false,
      isSeeded: true,
      isAudited: true,
      status: role.status === 'inactive' ? 'inactive' : 'active',
      scopeType: 'sub_department',
      scopeDepartmentId: parent.id,
      scopeSubDepartment: subDepartmentDef.name,
      isAdminEligible: true
    });
  }

  await Role.update(
    { isCustom: false, isSeeded: true },
    { where: { name: { [Op.in]: SEEDED_ADMIN_ROLE_NAMES } } }
  );
};
