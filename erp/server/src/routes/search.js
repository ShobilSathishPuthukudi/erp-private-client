import express from 'express';
import { Op } from 'sequelize';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { User, Department, Student, Task, Lead } = models;

router.get('/', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const query = `%${q}%`;
    const results = [];

    // 1. Search Users (Employees/Admins)
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: query } },
          { email: { [Op.like]: query } },
          { uid: { [Op.like]: query } }
        ]
      },
      attributes: ['uid', 'name', 'role'],
      limit: 5
    });
    users.forEach(u => results.push({ id: u.uid, title: u.name, type: 'User', role: u.role, path: `/dashboard/${u.role}` }));

    // 2. Search Departments
    const departments = await Department.findAll({
      where: {
        name: { [Op.like]: query }
      },
      limit: 5
    });
    departments.forEach(d => results.push({ id: d.id, title: d.name, type: 'Department', path: '/dashboard/org-admin/departments' }));

    // 3. Search Students
    const students = await Student.findAll({
      where: {
        name: { [Op.like]: query }
      },
      limit: 5
    });
    students.forEach(s => results.push({ id: s.id, title: s.name, type: 'Student', path: '/dashboard/academic/students' }));

    // 4. Search Tasks
    const tasks = await Task.findAll({
      where: {
        title: { [Op.like]: query }
      },
      limit: 5
    });
    tasks.forEach(t => results.push({ id: t.id, title: t.title, type: 'Task', path: '/dashboard/employee/tasks' }));

    // 5. Search Leads (CRM)
    const leads = await Lead.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: query } },
          { email: { [Op.like]: query } }
        ]
      },
      limit: 5
    });
    leads.forEach(l => results.push({ id: l.id, title: l.name, type: 'Lead', path: '/dashboard/sales' }));

    res.json(results);
  } catch (error) {
    console.error('Unified Search Error:', error);
    res.status(500).json({ error: 'Search operation failed' });
  }
});

export default router;
