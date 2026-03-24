import sequelize from '../config/db.js';

import User from './User.js';
import Department from './Department.js';
import Student from './Student.js';
import Program from './Program.js';
import Payment from './Payment.js';
import Invoice from './Invoice.js';
import Task from './Task.js';
import Leave from './Leave.js';
import AuditLog from './AuditLog.js';
import Event from './Event.js';
import CronJob from './CronJob.js';
import File from './File.js';

// Department -> User (Admin)
Department.belongsTo(User, { as: 'admin', foreignKey: 'adminId' });
User.hasMany(Department, { foreignKey: 'adminId' });

// User -> Department
User.belongsTo(Department, { foreignKey: 'deptId' });
Department.hasMany(User, { foreignKey: 'deptId' });

// Student -> Department (Study Center mapping)
Student.belongsTo(Department, { foreignKey: 'deptId' });
Department.hasMany(Student, { foreignKey: 'deptId' });

// Student -> Program
Student.belongsTo(Program, { foreignKey: 'programId' });
Program.hasMany(Student, { foreignKey: 'programId' });

// Payment -> Student
Payment.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(Payment, { foreignKey: 'studentId' });

// Invoice -> Payment
Invoice.belongsTo(Payment, { foreignKey: 'paymentId' });
Payment.hasOne(Invoice, { foreignKey: 'paymentId' });

// Invoice -> Student
Invoice.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(Invoice, { foreignKey: 'studentId' });

// Task -> User (assignedTo / assignedBy)
Task.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
Task.belongsTo(User, { as: 'assigner', foreignKey: 'assignedBy' });

// Leave -> User
Leave.belongsTo(User, { as: 'employee', foreignKey: 'employeeId' });
Leave.belongsTo(User, { as: 'step1Approver', foreignKey: 'step1By' });
Leave.belongsTo(User, { as: 'step2Approver', foreignKey: 'step2By' });

const models = {
  User,
  Department,
  Student,
  Program,
  Payment,
  Invoice,
  Task,
  Leave,
  AuditLog,
  Event,
  CronJob,
  File
};

export { sequelize, models };
