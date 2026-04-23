import sequelize from '../config/db.js';

import User from './User.js';
import Department from './Department.js';
import Student from './Student.js';
import Program from './Program.js';
import Payment from './Payment.js';
import Invoice from './Invoice.js';
import Task from './Task.js';
import Leave from './Leave.js';
import Lead from './Lead.js';
import Announcement from './Announcement.js';
import AuditLog from './AuditLog.js';
import Event from './Event.js';
import CronJob from './CronJob.js';
import File from './File.js';
import Survey from './Survey.js';
import SurveyResponse from './SurveyResponse.js';
import Notification from './Notification.js';
import ProgramFee from './ProgramFee.js';
import AccreditationRequest from './AccreditationRequest.js';
import ProgramOffering from './ProgramOffering.js';
import Exam from './Exam.js';
import Mark from './Mark.js';
import Result from './Result.js';
import ChangeRequest from './ChangeRequest.js';
import AdmissionSession from './AdmissionSession.js';
import Holiday from './Holiday.js';
import AnnouncementRead from './AnnouncementRead.js';
import LeadTouchpoint from './LeadTouchpoint.js';
import Quotation from './Quotation.js';
import Deal from './Deal.js';
import Target from './Target.js';
import TargetAssignment from './TargetAssignment.js';
import IncentiveRule from './IncentiveRule.js';
import IncentivePayout from './IncentivePayout.js';
import ReregRequest from './ReregRequest.js';
import ReregConfig from './ReregConfig.js';
import CredentialRequest from './CredentialRequest.js';
import Vacancy from './Vacancy.js';
import DistributionConfig from './DistributionConfig.js';
import PaymentDistribution from './PaymentDistribution.js';
import OrgConfig from './OrgConfig.js';
import CustomField from './CustomField.js';
import CEOPanel from './CEOPanel.js';
import Subject from './Subject.js';
import Module from './Module.js';
import CenterSubDept from './CenterSubDept.js';
import EMI from './EMI.js';
import CenterProgram from './CenterProgram.js';
import Attendance from './Attendance.js';
import Referral from './Referral.js';
import Permission from './Permission.js';
import Role from './Role.js';
import AcademicActionRequest from './AcademicActionRequest.js';
import PermissionVersion from './PermissionVersion.js';
import RolePermissionShadow from './RolePermissionShadow.js';
import EmployeeHRRequest from './EmployeeHRRequest.js';

// Department -> User (Admin)
Department.belongsTo(User, { as: 'admin', foreignKey: 'adminId' });
User.hasMany(Department, { foreignKey: 'adminId' });

// Role -> Department / User (Seeded admin role mapping)
Role.belongsTo(Department, { as: 'scopeDepartment', foreignKey: 'scopeDepartmentId' });
Department.hasMany(Role, { foreignKey: 'scopeDepartmentId', as: 'mappedRoles' });
Role.belongsTo(User, { as: 'assignedUser', foreignKey: 'assignedUserUid', targetKey: 'uid' });
User.hasMany(Role, { foreignKey: 'assignedUserUid', sourceKey: 'uid', as: 'assignedAdminRoles' });

// User -> Department
User.belongsTo(Department, { as: 'department', foreignKey: 'deptId' });
Department.hasMany(User, { foreignKey: 'deptId' });

// Department Hierarchy (Self-reference)
Department.belongsTo(Department, { as: 'parent', foreignKey: 'parentId' });
Department.hasMany(Department, { as: 'subDepartments', foreignKey: 'parentId' });

// Student -> Department (Institutional unit mapping)
Student.belongsTo(Department, { as: 'department', foreignKey: 'deptId' });
Student.belongsTo(Department, { as: 'center', foreignKey: 'centerId' });
Student.belongsTo(Department, { as: 'subDepartment', foreignKey: 'subDepartmentId' });
Department.hasMany(Student, { foreignKey: 'deptId' });
Department.hasMany(Student, { foreignKey: 'centerId', as: 'enrolledStudents' });
Department.hasMany(Student, { foreignKey: 'subDepartmentId', as: 'unitStudents' });

// Student -> Program
Student.belongsTo(Program, { foreignKey: 'programId' });
Program.hasMany(Student, { foreignKey: 'programId' });

// Program -> Department (University tracking)
Program.belongsTo(Department, { as: 'university', foreignKey: 'universityId' });
Department.hasMany(Program, { foreignKey: 'universityId' });

// Program -> ProgramFee
Program.hasMany(ProgramFee, { foreignKey: 'programId', as: 'fees' });
ProgramFee.belongsTo(Program, { foreignKey: 'programId' });

// Student -> ProgramFee (Fee Schema)
Student.belongsTo(ProgramFee, { as: 'feeSchema', foreignKey: 'feeSchemaId' });
ProgramFee.hasMany(Student, { foreignKey: 'feeSchemaId' });

// AccreditationRequest -> Department (Center)
AccreditationRequest.belongsTo(Department, { as: 'center', foreignKey: 'centerId' });
Department.hasMany(AccreditationRequest, { foreignKey: 'centerId' });

// AccreditationRequest -> Program
AccreditationRequest.belongsTo(Program, { as: 'linkedProgram', foreignKey: 'linkedProgramId' });

// ProgramOffering -> Center (Department)
ProgramOffering.belongsTo(Department, { as: 'center', foreignKey: 'centerId' });
Department.hasMany(ProgramOffering, { foreignKey: 'centerId', as: 'offerings' });

// ProgramOffering -> Program
ProgramOffering.belongsTo(Program, { foreignKey: 'programId' });
Program.hasMany(ProgramOffering, { foreignKey: 'programId', as: 'offeringCenters' });

// Center -> Program Mapping (New Phase 3 Standard)
CenterProgram.belongsTo(Department, { as: 'center', foreignKey: 'centerId' });
Department.hasMany(CenterProgram, { foreignKey: 'centerId', as: 'mappedPrograms' });
CenterProgram.belongsTo(Program, { foreignKey: 'programId' });
Program.hasMany(CenterProgram, { foreignKey: 'programId' });
CenterProgram.belongsTo(ProgramFee, { as: 'feeSchema', foreignKey: 'feeSchemaId' });
ProgramFee.hasMany(CenterProgram, { foreignKey: 'feeSchemaId' });

// Payment -> Student
Payment.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });
Student.hasMany(Payment, { as: 'payments', foreignKey: 'studentId' });

// Step 5: Master Associations (Unaliased for direct query consistency)
Invoice.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });
Invoice.belongsTo(Payment, { foreignKey: 'paymentId' });

Student.hasMany(Invoice, { foreignKey: 'studentId' });
Payment.hasMany(Invoice, { foreignKey: 'paymentId' });

// Gated activation link (Must be aliased to avoid ambiguity with studentId link)
Student.belongsTo(Invoice, { as: 'activationInvoice', foreignKey: 'invoiceId' });
Student.belongsTo(Invoice, { as: 'invoice', foreignKey: 'invoiceId' });
Invoice.hasMany(Student, { as: 'gatedStudents', foreignKey: 'invoiceId' });

// EMI -> Student/Invoice
Student.hasMany(EMI, { foreignKey: 'studentId', as: 'emis' });
EMI.belongsTo(Student, { foreignKey: 'studentId' });
Invoice.hasMany(EMI, { foreignKey: 'invoiceId', as: 'installments' });
EMI.belongsTo(Invoice, { foreignKey: 'invoiceId' });

// Task -> User (assignedTo / assignedBy)
Task.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
Task.belongsTo(User, { as: 'assigner', foreignKey: 'assignedBy' });

// Leave -> User
Leave.belongsTo(User, { as: 'employee', foreignKey: 'employeeId' });
Leave.belongsTo(User, { as: 'step1Approver', foreignKey: 'step1By' });
Leave.belongsTo(User, { as: 'step2Approver', foreignKey: 'step2By' });

// AuditLog -> User
AuditLog.belongsTo(User, { as: 'user', foreignKey: 'userId', targetKey: 'uid' });

Lead.belongsTo(User, { foreignKey: 'assignedTo', targetKey: 'uid', as: 'assignee' });
User.hasMany(Lead, { foreignKey: 'assignedTo', sourceKey: 'uid', as: 'leads' });

// Requested by user for stabilization
Lead.belongsTo(User, { foreignKey: 'employeeId', as: 'employee' });
Lead.belongsTo(Department, { as: 'Center', foreignKey: 'centerId' });
Referral.belongsTo(User, { foreignKey: 'userId', targetKey: 'uid' });
User.hasOne(Referral, { foreignKey: 'userId', sourceKey: 'uid' });

// Lead -> LeadTouchpoint
Lead.hasMany(LeadTouchpoint, { foreignKey: 'leadId', as: 'touchpoints' });
LeadTouchpoint.belongsTo(Lead, { foreignKey: 'leadId' });

// Lead -> BDE (User)
Lead.belongsTo(User, { as: 'referrer', foreignKey: 'bdeId', targetKey: 'uid' });

// Lead -> Quotation
Lead.hasMany(Quotation, { foreignKey: 'leadId', as: 'quotations' });
Quotation.belongsTo(Lead, { foreignKey: 'leadId' });

// Touchpoint/Quotation -> Creator
LeadTouchpoint.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', targetKey: 'uid' });
Quotation.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', targetKey: 'uid' });

// Department -> BDE Referral
Department.belongsTo(User, { as: 'referringBDE', foreignKey: 'bdeId', targetKey: 'uid' });

// Department -> Source Lead (fallback referral traceability when bdeId is null)
Department.belongsTo(Lead, { as: 'sourceLead', foreignKey: 'sourceLeadId' });

// Lead -> Deal
Lead.hasMany(Deal, { foreignKey: 'leadId', as: 'deals' });
Deal.belongsTo(Lead, { foreignKey: 'leadId' });

// User -> Target (Individual)
User.hasMany(Target, { foreignKey: 'targetableId', sourceKey: 'uid', as: 'targets' });
Target.belongsTo(User, { foreignKey: 'targetableId', targetKey: 'uid', as: 'employee' });

// Target -> IncentiveRule
Target.hasMany(IncentiveRule, { foreignKey: 'targetId', as: 'rules' });
IncentiveRule.belongsTo(Target, { foreignKey: 'targetId' });

// Target -> Assignments
Target.hasMany(TargetAssignment, { foreignKey: 'targetId', as: 'assignments' });
TargetAssignment.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });
User.hasMany(TargetAssignment, { foreignKey: 'employeeUid', sourceKey: 'uid', as: 'targetAssignments' });
TargetAssignment.belongsTo(User, { foreignKey: 'employeeUid', targetKey: 'uid', as: 'employee' });
Task.hasMany(TargetAssignment, { foreignKey: 'taskId', as: 'targetAssignments' });
TargetAssignment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

// User -> Payouts
User.hasMany(IncentivePayout, { foreignKey: 'userId', sourceKey: 'uid', as: 'payouts' });
IncentivePayout.belongsTo(User, { foreignKey: 'userId', targetKey: 'uid', as: 'employee' });

// Payout -> Rule
IncentivePayout.belongsTo(IncentiveRule, { foreignKey: 'ruleId' });
IncentivePayout.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });
IncentivePayout.belongsTo(TargetAssignment, { foreignKey: 'assignmentId', as: 'assignment' });
TargetAssignment.hasOne(IncentivePayout, { foreignKey: 'assignmentId', as: 'payout' });

// Student -> ReregRequest
// Student -> ReregRequest
Student.hasMany(ReregRequest, { foreignKey: 'studentId', as: 'reregRequests' });
ReregRequest.belongsTo(Student, { foreignKey: 'studentId' });

// Program -> ReregConfig
ReregConfig.belongsTo(Program, { foreignKey: 'programId' });

// Center -> CredentialRequest
Department.hasMany(CredentialRequest, { foreignKey: 'centerId', as: 'revealRequests' });
CredentialRequest.belongsTo(Department, { foreignKey: 'centerId', as: 'center' });

// User -> CredentialRequest
User.hasMany(CredentialRequest, { foreignKey: 'requesterId', sourceKey: 'uid', as: 'requests' });
CredentialRequest.belongsTo(User, { foreignKey: 'requesterId', targetKey: 'uid', as: 'requester' });

// AcademicActionRequest -> User
AcademicActionRequest.belongsTo(User, { as: 'requester', foreignKey: 'requesterId', targetKey: 'uid' });
AcademicActionRequest.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy', targetKey: 'uid' });

// User Hierarchy (Self-reference)
User.belongsTo(User, { as: 'manager', foreignKey: 'reportingManagerUid', targetKey: 'uid' });
User.hasMany(User, { as: 'subordinates', foreignKey: 'reportingManagerUid', sourceKey: 'uid' });

// User -> Role (Eligibility verification)
User.belongsTo(Role, { foreignKey: 'role', targetKey: 'name', as: 'RoleDetails' });
Role.hasMany(User, { foreignKey: 'role', sourceKey: 'name', as: 'Employees' });

// User -> Vacancy
User.belongsTo(Vacancy, { foreignKey: 'vacancyId', as: 'hiringVacancy' });
Vacancy.hasMany(User, { foreignKey: 'vacancyId', as: 'employees' });

// Vacancy -> Department
Vacancy.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Department.hasMany(Vacancy, { foreignKey: 'departmentId' });

// User -> Attendance
User.hasMany(Attendance, { foreignKey: 'userId', sourceKey: 'uid', as: 'attendanceRecords' });
Attendance.belongsTo(User, { foreignKey: 'userId', targetKey: 'uid' });

// Program -> DistributionConfig
Program.hasMany(DistributionConfig, { foreignKey: 'programId', as: 'distributions' });
DistributionConfig.belongsTo(Program, { foreignKey: 'programId' });

// Payment -> PaymentDistribution
// Note: Payment model is loaded as 'Invoice' or 'Payment' from previous sessions
// I will check the exact name in associations below.
// Re-verifying associations from previous code: Payment is often 'Payment' or linked to 'Invoice'.
// I'll assume standard naming based on user prompt 2.
Payment.hasMany(PaymentDistribution, { foreignKey: 'paymentId', as: 'payouts' });
PaymentDistribution.belongsTo(Payment, { foreignKey: 'paymentId' });

// CEOPanel -> User
CEOPanel.belongsTo(User, { as: 'ceoUser', foreignKey: 'userId', targetKey: 'uid' });
User.hasMany(CEOPanel, { as: 'ceoPanels', foreignKey: 'userId', sourceKey: 'uid' });

Announcement.belongsTo(User, { foreignKey: 'authorId', targetKey: 'uid', as: 'author' });

Survey.belongsTo(User, { foreignKey: 'createdBy', targetKey: 'uid' });
User.hasMany(Survey, { foreignKey: 'createdBy', sourceKey: 'uid' });

Survey.hasMany(SurveyResponse, { foreignKey: 'surveyId' });
SurveyResponse.belongsTo(Survey, { foreignKey: 'surveyId' });

SurveyResponse.belongsTo(User, { foreignKey: 'userUid', targetKey: 'uid' });
User.hasMany(SurveyResponse, { foreignKey: 'userUid', sourceKey: 'uid' });

User.hasMany(Notification, { foreignKey: 'userUid', sourceKey: 'uid' });
Notification.belongsTo(User, { foreignKey: 'userUid', targetKey: 'uid' });

User.hasMany(EmployeeHRRequest, { foreignKey: 'employeeId', sourceKey: 'uid', as: 'hrRequests' });
EmployeeHRRequest.belongsTo(User, { foreignKey: 'employeeId', targetKey: 'uid', as: 'employee' });
EmployeeHRRequest.belongsTo(User, { foreignKey: 'respondedBy', targetKey: 'uid', as: 'responder' });

// Exam -> Program
Exam.belongsTo(Program, { foreignKey: 'programId' });
Program.hasMany(Exam, { foreignKey: 'programId' });

// Mark -> Student
Mark.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(Mark, { foreignKey: 'studentId', as: 'examMarks' });

// Mark -> Exam
Mark.belongsTo(Exam, { foreignKey: 'examId' });
Exam.hasMany(Mark, { foreignKey: 'examId' });

// Result -> Student
Result.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(Result, { foreignKey: 'studentId' });

// Result -> Program
Result.belongsTo(Program, { foreignKey: 'programId' });
Program.hasMany(Result, { foreignKey: 'programId' });

// --- Syllabus Management ---
Program.hasMany(Subject, { foreignKey: 'programId', as: 'subjects' });
Subject.belongsTo(Program, { foreignKey: 'programId' });

Subject.hasMany(Module, { foreignKey: 'subjectId', as: 'modules', onDelete: 'CASCADE' });
Module.belongsTo(Subject, { foreignKey: 'subjectId' });

// --- Sub-Department Portals ---
Department.hasMany(CenterSubDept, { as: 'subDepts', foreignKey: 'centerId' });
CenterSubDept.belongsTo(Department, { foreignKey: 'centerId' });

// Support for direct sub-dept filtering on students/programs/sessions
// These already have subDeptId/type but we can add descriptive helpers if needed

// ChangeRequest -> Center
ChangeRequest.belongsTo(Department, { as: 'center', foreignKey: 'centerId' });
ChangeRequest.belongsTo(Department, { as: 'currentUniversity', foreignKey: 'currentUniversityId' });
ChangeRequest.belongsTo(Department, { as: 'requestedUniversity', foreignKey: 'requestedUniversityId' });
ChangeRequest.belongsTo(Program, { as: 'currentProgram', foreignKey: 'currentProgramId' });
ChangeRequest.belongsTo(Program, { as: 'requestedProgram', foreignKey: 'requestedProgramId' });
ChangeRequest.belongsTo(ProgramFee, { as: 'requestedFeeSchema', foreignKey: 'requestedFeeSchemaId' });
Department.hasMany(ChangeRequest, { foreignKey: 'centerId' });

// AdmissionSession -> Program
AdmissionSession.belongsTo(Program, { foreignKey: 'programId' });
Program.hasMany(AdmissionSession, { foreignKey: 'programId' });

// Student -> AdmissionSession
Student.belongsTo(AdmissionSession, { foreignKey: 'sessionId' });
AdmissionSession.hasMany(Student, { foreignKey: 'sessionId', as: 'students' });
Student.belongsTo(AdmissionSession, { as: 'nextSession', foreignKey: 'nextSessionId' });
AdmissionSession.hasMany(Student, { foreignKey: 'nextSessionId', as: 'upcomingStudents' });

// AdmissionSession -> SubDept
AdmissionSession.belongsTo(Department, { as: 'subDept', foreignKey: 'subDeptId' });
AdmissionSession.belongsTo(Department, { as: 'center', foreignKey: 'centerId' });
Department.hasMany(AdmissionSession, { foreignKey: 'centerId', as: 'sessions' });

// Announcement -> Program/University (for Ops filtering)
Announcement.belongsTo(Program, { foreignKey: 'programId', as: 'program' });
Announcement.belongsTo(Department, { foreignKey: 'universityId', as: 'university' });
Announcement.belongsTo(Department, { foreignKey: 'centerId', as: 'center' });

// Announcement Read Tracking
Announcement.hasMany(AnnouncementRead, { foreignKey: 'announcementId', as: 'reads' });
AnnouncementRead.belongsTo(Announcement, { foreignKey: 'announcementId' });
User.hasMany(AnnouncementRead, { foreignKey: 'userId', sourceKey: 'uid' });
AnnouncementRead.belongsTo(User, { foreignKey: 'userId', targetKey: 'uid' });

import { context } from '../lib/context.js';

// ... (previous associations)

const models = {
  User,
  Department,
  Student,
  Program,
  Payment,
  Invoice,
  Task,
  Leave,
  Lead,
  Announcement,
  AuditLog,
  Event,
  CronJob,
  File,
  Survey,
  SurveyResponse,
  Notification,
  ProgramFee,
  AccreditationRequest,
  ProgramOffering,
  Exam,
  Mark,
  Result,
  ChangeRequest,
  AdmissionSession,
  Holiday,
  AnnouncementRead,
  LeadTouchpoint,
  Quotation,
  Deal,
  Target,
  TargetAssignment,
  IncentiveRule,
  IncentivePayout,
  ReregRequest,
  ReregConfig,
  CredentialRequest,
  DistributionConfig,
  PaymentDistribution,
  OrgConfig,
  CustomField,
  CEOPanel,
  Subject,
  Module,
  CenterSubDept,
  CenterProgram,
  Vacancy,
  EMI,
  Attendance,
  Referral,
  Permission,
  Role,
  AcademicActionRequest,
  PermissionVersion,
  RolePermissionShadow,
  EmployeeHRRequest
};

// GAP-5: Global Audit Interceptor
// This interceptor captures every mutation in the system without requiring manual logging in routes.
const auditHook = async (action, instance, options) => {
  // GAP-5: Robust recursion guard (Case-insensitive)
  const modelName = instance.constructor.name?.toLowerCase();
  if (modelName === 'auditlog' || modelName === 'audit_log') return;

  const store = context.getStore();
  if (!store) return; // Ignore background tasks or unauthenticated requests for now

  // Security Best Practice: Sanitize internal integers and PII from auditable footprint
  const sanitizePayload = (data) => {
    if (!data) return null;
    const clone = { ...data };
    // Prevent IDOR by stripping internal integer primary keys
    if (clone.id && typeof clone.id === 'number') delete clone.id;
    // Strip sensitive cryptographic artifacts
    if (clone.password !== undefined) delete clone.password;
    if (clone.devCredential !== undefined) delete clone.devCredential;
    // Strip noisy ORM timestamps for cleaner diffs
    if (clone.createdAt !== undefined) delete clone.createdAt;
    if (clone.updatedAt !== undefined) delete clone.updatedAt;
    return clone;
  };

  try {
    const model = instance.constructor;
    const store = context.getStore();
    const userId = store?.userId || 'SYSTEM';

    await AuditLog.create({
      userId: userId,
      action: action,
      entity: model.name || instance.constructor.name,
      module: 'System Intercept', // Can be refined if needed
      before: action === 'Create' ? null : sanitizePayload(instance._previousDataValues),
      after: action === 'Delete' ? null : sanitizePayload(instance.dataValues),
      timestamp: new Date()
    }, { transaction: options.transaction });
  } catch (error) {
    console.error('Global Audit Failure:', {
      error: error.message,
      action,
      entity: instance.constructor.name
    });
  }
};

// Register hooks on all models except AuditLog themselves to avoid recursion
Object.values(sequelize.models).forEach((model) => {
  const modelName = model.name?.toLowerCase();
  if (modelName === 'auditlog' || modelName === 'audit_log') return;
  
  model.addHook('afterCreate', (instance, options) => auditHook('Create', instance, options));
  model.addHook('afterUpdate', (instance, options) => auditHook('Update', instance, options));
  model.addHook('afterDestroy', (instance, options) => auditHook('Delete', instance, options));
});

export { sequelize, models };
