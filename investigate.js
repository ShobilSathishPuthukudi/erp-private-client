import { Op } from 'sequelize';

const permissionFilter = {};
const visibilityFilter = {
  [Op.or]: [
    { deptId: { [Op.in]: [1, 2, 3] } },
    { departmentId: { [Op.in]: [1, 2, 3] } },
    { subDepartmentId: { [Op.in]: [1, 2, 3] } },
    { subDepartment: { [Op.in]: ['Dept A', 'Dept B'] } }
  ]
};

const combinedFilter = { ...permissionFilter, ...visibilityFilter };
console.log('Combined Filter:', JSON.stringify(combinedFilter, null, 2));
console.log('Op.or in combined:', combinedFilter[Op.or]);
