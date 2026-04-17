import express from 'express';
import bcrypt from 'bcryptjs';
import { models } from '../models/index.js';
import { verifyToken, roleGuard } from '../middleware/verifyToken.js';
import { ACADEMIC_HIERARCHY } from '../config/rbac.js';
import { Op } from 'sequelize';
import { SEEDED_DEPARTMENT_NAMES } from '../config/institutionalStructure.js';

const router = express.Router();
const { Department, User } = models;

const isOrgAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase()?.trim();
  const allowedRoles = [
    'organization admin', 
    'Finance Admin', 'HR Admin', 'Operations Admin', 'Academic Operations Admin', 'Sales & CRM Admin', 
    'CEO', 'Sales', 'Finance', 'HR', 'Operations', 'Academic', 'Staff'
  ];
  
  const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
  
  if (!normalizedAllowed.includes(role)) {
    return res.status(403).json({ error: 'Access denied: Requires administrative or institutional role' });
  }
  next();
};

const isDeptManagedAdmin = roleGuard(['Organization Admin', 'hr', 'hr admin', 'Operations Admin', 'Academic Operations Admin']);

router.get('/', verifyToken, isDeptManagedAdmin, async (req, res) => {
  try {
    const { type, includeBranches } = req.query;
    const where = {};
    if (type) {
      where.type = type;
    } else if (includeBranches !== 'true') {
      where.type = {
        [Op.or]: [
          { [Op.notIn]: ['branch', 'branches'] },
          { [Op.is]: null }
        ]
      };
    }

    const departments = await Department.findAll({
      where, 
      include: [
        { model: User, as: 'admin', attributes: ['name', 'email', 'uid'], required: false },
        { model: Department, as: 'parent', attributes: ['id', 'name'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(departments);
  } catch (error) {
    console.error('Fetch departments error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch departments' });
  }
});

router.post('/', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { 
      name, shortName, type, adminId, status, features, activateNow, 
      adminName, adminEmail, adminPassword,
      timezone, currency, academicYearStart, logo,
      metadata, newAdmin, parentId, address
    } = req.body;

    // Support nested payload from previous versions or specific frontend structures
    const finalShortName = shortName || metadata?.shortName;
    const finalLogo = logo || metadata?.logo;
    const finalTimezone = timezone || metadata?.timezone;
    const finalCurrency = currency || metadata?.currency;
    const finalAcademicYearStart = academicYearStart || metadata?.academicYearStart;
    const finalFeatures = features || metadata?.features || [];

    const finalAdminName = adminName || newAdmin?.name;
    const finalAdminEmail = adminEmail || newAdmin?.email || newAdmin?.adminEmail;
    const finalAdminPassword = adminPassword || newAdmin?.password || newAdmin?.adminPassword;

    if (['departments', 'department', 'sub-departments', 'sub-department'].includes((type || '').toLowerCase())) {
      return res.status(403).json({ error: 'Core departments and sub-departments are seed-managed and cannot be created here.' });
    }
    
    const existing = await Department.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Department name already exists' });
    }

    let finalAdminId = adminId;

    // Handle new admin creation if credentials are provided
    if (finalAdminEmail && finalAdminPassword && finalAdminName) {
      const userExists = await User.findOne({ where: { email: finalAdminEmail } });
      if (userExists) {
        return res.status(400).json({ error: 'Admin email already exists' });
      }

      const hashedPassword = await bcrypt.hash(finalAdminPassword, 10);
      
      // Determine role based on department type
      let role = 'Operations Admin';
      const typeLower = type ? type.toLowerCase() : 'custom';
      if (['hr', 'finance', 'sales', 'operations'].includes(typeLower)) {
        role = `${typeLower.charAt(0).toUpperCase() + typeLower.slice(1)} Admin`;
      } else if (typeLower === 'partner-center') {
        role = 'Regional Admin';
      }

      const generatedUid = `${role.toUpperCase().substring(0,3)}-${Date.now().toString().slice(-6)}`;

      const newUser = await User.create({
        uid: generatedUid,
        email: finalAdminEmail,
        password: hashedPassword,
        devPassword: finalAdminPassword,
        role: role,
        name: finalAdminName,
        status: 'active'
      });

      finalAdminId = newUser.uid;
    }

    // Handle status consistency
    let finalStatus = 'active';
    if (status) finalStatus = status.toLowerCase();
    else if (activateNow !== undefined) finalStatus = activateNow ? 'active' : 'inactive';

    if (type === 'universities' && finalStatus !== 'active' && finalStatus !== 'inactive') {
      finalStatus = 'proposed';
    }

    // Enforce Institutional Hierarchy for Academic Sub-Departments
    let finalParentId = parentId;
    if (ACADEMIC_HIERARCHY.CHILDREN.some(child => name.toLowerCase().includes(child.toLowerCase()))) {
      const parentDept = await Department.findOne({ where: { name: ACADEMIC_HIERARCHY.PARENT } });
      if (parentDept) {
        finalParentId = parentDept.id;
        console.log(`[HIERARCHY] Automatically parenting '${name}' under '${ACADEMIC_HIERARCHY.PARENT}'`);
      }
    }

    const newDept = await Department.create({
      name, 
      shortName: finalShortName,
      type: type === 'branch' ? 'branches' : type, 
      adminId: finalAdminId || null, 
      parentId: finalParentId || null,
      status: finalStatus,
      logo: finalLogo,
      address,
      metadata: {
        features: finalFeatures,
        timezone: finalTimezone,
        currency: finalCurrency,
        academicYearStart: finalAcademicYearStart
      }
    });

    // SYNC: Ensure the assigned admin's User record also points to this department
    if (finalAdminId) {
      await User.update({ deptId: newDept.id }, { where: { uid: finalAdminId } });
    }

    res.status(201).json(newDept);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: error.message || 'Failed to create department' });
  }
});

router.put('/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, shortName, type, adminId, status, features, 
      adminName, adminEmail, adminPassword,
      timezone, currency, academicYearStart, logo, parentId, address
    } = req.body;

    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (
      SEEDED_DEPARTMENT_NAMES.includes(dept.name) &&
      ['departments', 'department', 'sub-departments', 'sub-department'].includes((dept.type || '').toLowerCase()) &&
      [name, shortName, type, adminId, parentId].some((value) => value !== undefined)
    ) {
      return res.status(403).json({ error: 'Seed-managed departments can only be changed through the institutional seed structure and role mapping flow.' });
    }

    let finalAdminId = adminId;

    // Support creating a new admin during update if credentials are provided
    if (adminEmail && adminPassword && adminName) {
      const userExists = await User.findOne({ where: { email: adminEmail } });
      if (userExists) {
        return res.status(400).json({ error: 'Admin email already exists' });
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      // Determine role based on department type
      let role = 'Operations Admin';
      const typeLower = type ? type.toLowerCase() : (dept.type || 'custom').toLowerCase();
      if (['hr', 'finance', 'sales', 'operations'].includes(typeLower)) {
        role = `${typeLower.charAt(0).toUpperCase() + typeLower.slice(1)} Admin`;
      } else if (typeLower === 'partner-center') {
        role = 'Regional Admin';
      }

      const generatedUid = `${role.toUpperCase().substring(0,3)}-${Date.now().toString().slice(-6)}`;

      const newUser = await User.create({
        uid: generatedUid,
        email: adminEmail,
        password: hashedPassword,
        devPassword: adminPassword,
        role: role,
        name: adminName,
        status: 'active',
        deptId: dept.id // Auto-link to this department
      });

      finalAdminId = newUser.uid;
    }

    // Enforce Institutional Hierarchy for Academic Sub-Departments on Update
    let finalParentId = parentId !== undefined ? parentId : dept.parentId;
    if (name && ACADEMIC_HIERARCHY.CHILDREN.some(child => name.toLowerCase().includes(child.toLowerCase()))) {
      const parentDept = await Department.findOne({ where: { name: ACADEMIC_HIERARCHY.PARENT } });
      if (parentDept) {
        finalParentId = parentDept.id;
      }
    }

    const updateData = { 
      name, 
      shortName, 
      type: type === 'branch' ? 'branches' : type, 
      adminId: finalAdminId || null, 
      parentId: finalParentId,
      status,
      logo,
      address: address !== undefined ? address : dept.address,
      metadata: {
        ...(dept.metadata || {}),
        features: features || dept.metadata?.features || [],
        timezone: timezone || dept.metadata?.timezone,
        currency: currency || dept.metadata?.currency,
        academicYearStart: academicYearStart || dept.metadata?.academicYearStart
      }
    };

    await dept.update(updateData);

    // SYNC: Ensure the assigned admin's User record also points to this department
    if (finalAdminId) {
      if (dept.adminId && dept.adminId !== finalAdminId) {
        await User.update({ deptId: null }, { where: { uid: dept.adminId, deptId: dept.id } });
      }
      await User.update({ deptId: dept.id }, { where: { uid: finalAdminId } });
    }

    await dept.reload({ 
      include: [
        { model: User, as: 'admin', attributes: ['name', 'email', 'uid'] },
        { model: Department, as: 'parent', attributes: ['id', 'name'] }
      ] 
    });
    res.json(dept);
} catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (SEEDED_DEPARTMENT_NAMES.includes(dept.name)) {
      return res.status(403).json({ error: 'Seed-managed departments cannot be deleted. Use deactivate instead.' });
    }
    
    // GAP-SOFT-DELETE: Satisfy non-destructive policy by archiving instead of destroying
    await dept.update({ status: 'inactive' });
    res.json({ message: 'Department archived successfully' });
  } catch (error) {
    console.error('Archive department error:', error);
    res.status(500).json({ error: 'Failed to archive department' });
  }
});

export default router;
