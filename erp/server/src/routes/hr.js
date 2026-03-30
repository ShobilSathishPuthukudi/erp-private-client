
import { applyExecutiveScope } from '../middleware/visibility.js';
import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { models, sequelize } from '../models/index.js';
import { verifyToken, roleGuard } from '../middleware/verifyToken.js';

const router = express.Router();
const { User, Vacancy, Task, Department, Leave, Attendance } = models;

const isHR = roleGuard(['hr', 'org-admin', 'system-admin', 'ceo']);

// Step 9: Logging Middleware
router.use((req, res, next) => {
    console.log("HR API HIT:", req.url);
    next();
});

// Step 7: FIX STATS API
router.get('/stats', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
  try {
    const { filter: visibilityFilter } = req.visibility;
    const [employeeCount, vacancyCount, pendingLeaves, activeTasks] = await Promise.all([
      User.count({ where: { status: 'active', role: 'employee', ...visibilityFilter } }),
      Vacancy.count({ where: { status: 'OPEN', ...visibilityFilter } }),
      Leave.count({ 
        where: { status: { [Op.like]: 'pending%' } },
        include: [{ model: User, as: 'employee', where: visibilityFilter, required: true }]
      }),
      Task.count({ 
        where: { status: 'pending' },
        include: [{ model: User, as: 'assignee', where: visibilityFilter, required: true }]
      })
    ]);
    
    res.json({
      totalEmployees: employeeCount || 0,
      activeEmployees: employeeCount || 0,
      pendingLeaves: pendingLeaves || 0,
      avgPerformance: 0,
      activeTasks: activeTasks || 0
    });
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

// Step 6: FIX VACANCIES API
router.get('/vacancies', verifyToken, applyExecutiveScope, async (req, res) => {
  try {
    const { filter: visibilityFilter } = req.visibility;
    const vacancies = await Vacancy.findAll({
      where: visibilityFilter,
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });
    res.json(vacancies);
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

router.post('/vacancies', verifyToken, isHR, async (req, res) => {
  try {
    const { title, departmentId, subDepartment, count, requirements } = req.body;
    
    if (!title || !departmentId) {
      return res.status(400).json({ message: "Invalid payload: title and departmentId required", module: "HR" });
    }

    const vacancy = await Vacancy.create({
      title,
      departmentId,
      subDepartment: subDepartment || 'General',
      count: count || 1,
      requirements,
      status: 'OPEN'
    });
    res.status(201).json(vacancy);
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

// Step 4: FIX DATABASE QUERIES (Employees)
router.get('/employees', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
  try {
    const { filter: visibilityFilter } = req.visibility;
    const employees = await User.findAll({
      where: { 
        role: { [Op.notIn]: ['org-admin', 'system-admin'] },
        ...visibilityFilter 
      }, 
      attributes: { exclude: ['password'] },
      include: [
        { model: Department, as: 'department', attributes: ['name'] },
        { model: User, as: 'manager', attributes: ['name', 'uid'] }
      ]
    });
    res.json(employees);
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

router.post('/employees', verifyToken, isHR, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { vacancyId, email, password, name, reportingManagerUid, role } = req.body;

    if (!vacancyId || !email || !password) {
      return res.status(400).json({ message: "Invalid payload: email, password, and vacancyId required", module: "HR" });
    }

    const vacancy = await Vacancy.findByPk(vacancyId, { transaction: t });
    if (!vacancy || vacancy.status !== 'OPEN' || vacancy.filledCount >= vacancy.count) {
      return res.status(400).json({ message: "Selected vacancy is invalid or already filled.", module: "HR" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `EMP-${Date.now().toString().slice(-6)}`;

    const newUser = await User.create({
      uid: generatedUid,
      email,
      password: hashedPassword,
      role: role || 'employee',
      name,
      deptId: vacancy.departmentId,
      subDepartment: vacancy.subDepartment,
      reportingManagerUid,
      vacancyId,
      status: 'active'
    }, { transaction: t });

    vacancy.filledCount += 1;
    if (vacancy.filledCount >= vacancy.count) {
      vacancy.status = 'CLOSED';
    }
    await vacancy.save({ transaction: t });

    await t.commit();
    res.status(201).json({ uid: newUser.uid, name: newUser.name });
  } catch (error) {
    if (t) await t.rollback();
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});
router.post('/employees/onboard', verifyToken, isHR, async (req, res) => {
  try {
    const { email, password, name, departmentId, subDepartment, role, reportingManagerUid } = req.body;

    if (!email || !password || !name || !departmentId) {
      return res.status(400).json({ message: "Invalid payload: email, password, name, and departmentId required", module: "HR" });
    }

    // Check if user already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "An employee with this email already exists.", module: "HR" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `EMP-${Date.now().toString().slice(-6)}`;

    const newUser = await User.create({
      uid: generatedUid,
      email,
      password: hashedPassword,
      role: role || 'employee',
      name,
      deptId: departmentId,
      subDepartment: subDepartment || 'General',
      reportingManagerUid,
      status: 'pending_dept' // Awaiting department admin acceptance
    });

    res.status(201).json({ uid: newUser.uid, name: newUser.name, status: newUser.status });
  } catch (error) {
    console.error("HR ONBOARD ERROR:", error);
    res.status(500).json({ message: "Failed to onboard employee", module: "HR" });
  }
});

// [NEW] PUT /employees/:uid - Update personnel details
router.put('/employees/:uid', verifyToken, isHR, async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, password, role, name, status, deptId, reportingManagerUid, subDepartment } = req.body;

    const user = await User.findByPk(uid);
    if (!user) {
      return res.status(404).json({ message: "Personnel record not found", module: "HR" });
    }

    const updates = {
      email: email || user.email,
      role: role || user.role,
      name: name || user.name,
      status: status || user.status,
      deptId: deptId === undefined ? user.deptId : deptId,
      reportingManagerUid: reportingManagerUid === undefined ? user.reportingManagerUid : reportingManagerUid,
      subDepartment: subDepartment || user.subDepartment
    };

    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
    }

    await user.update(updates);

    res.json({ message: "Personnel record updated successfully", uid: user.uid });
  } catch (error) {
    console.error("HR UPDATE ERROR:", error);
    res.status(500).json({ message: "Failed to update personnel record", module: "HR" });
  }
});

// Step 1: FIX API STRUCTURE (Performance Split)
router.get('/performance/summary', verifyToken, isHR, async (req, res) => {
  try {
    const tasks = await Task.findAll();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    
    res.json({
      totalTasks: total,
      completedTasks: completed,
      avgPerformance: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

router.get('/performance/employee/:employeeId', verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ message: "Invalid employeeId", module: "HR" });

    const user = await User.findOne({ where: { uid: employeeId, role: 'employee' } });
    if (!user) return res.status(404).json({ message: "Employee not found", module: "HR" });

    const tasks = await Task.findAll({ where: { assignedTo: employeeId } });
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;

    res.json({
      employeeId,
      metrics: {
        taskCompletionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
        totalTasks: total
      }
    });
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

router.get('/performance/department/:departmentId', verifyToken, isHR, async (req, res) => {
    try {
      const { departmentId } = req.params;
      if (!departmentId) return res.status(400).json({ message: "Invalid departmentId", module: "HR" });
  
      const employees = await User.findAll({ where: { deptId: departmentId, role: 'employee' } });
      const uids = employees.map(e => e.uid);
  
      const tasks = await Task.findAll({ where: { assignedTo: uids } });
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
  
      res.json({
        departmentId,
        metrics: {
          teamSize: employees.length,
          taskCompletionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
          totalTasks: total
        }
      });
    } catch (error) {
      console.error("HR API ERROR:", error);
      res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

// Step 5: IMPLEMENT MISSING ROUTE (Leaves)
router.get('/leaves', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
    try {
        const { filter: visibilityFilter } = req.visibility;
        const leaves = await Leave.findAll({
            where: {},
            include: [{ 
              model: User, 
              as: 'employee', 
              attributes: ['name', 'uid', 'deptId'],
              where: visibilityFilter,
              required: true
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(leaves);
    } catch (error) {
        console.error("HR API ERROR:", error);
        res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

// Task Management
router.get('/tasks', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
    try {
        const { filter: visibilityFilter } = req.visibility;
        const tasks = await Task.findAll({
            where: {},
            include: [
                { 
                  model: User, 
                  as: 'assignee', 
                  attributes: ['name', 'uid'],
                  where: visibilityFilter,
                  required: true
                },
                { model: User, as: 'assigner', attributes: ['name', 'uid'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(tasks);
    } catch (error) {
        console.error("HR API ERROR:", error);
        res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

router.post('/tasks', verifyToken, async (req, res) => {
    try {
      const { assignedTo, title, deadline, priority, description } = req.body;
      if (!assignedTo || !title) {
          return res.status(400).json({ message: "Invalid payload: assignedTo and title required", module: "HR" });
      }
  
      const task = await Task.create({
        assignedTo,
        assignedBy: req.user.uid,
        title,
        deadline,
        priority: priority || 'medium',
        status: 'pending',
        description
      });
      res.status(201).json(task);
    } catch (error) {
      console.error("HR API ERROR:", error);
      res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

export default router;
