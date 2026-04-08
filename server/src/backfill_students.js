
import { sequelize, models } from './models/index.js';
import bcrypt from 'bcryptjs';

const { Student, User } = models;

async function backfillStudentUsers() {
    try {
        console.log('[SYNC] Starting institutional student identity backfill...');
        
        const enrolledStudents = await Student.findAll({
            where: { status: 'ENROLLED' }
        });
        
        console.log(`[SYNC] Located ${enrolledStudents.length} enrolled students.`);
        
        let createdCount = 0;
        let existedCount = 0;
        
        const hashedPassword = await bcrypt.hash('Student@123', 10);
        
        for (const student of enrolledStudents) {
            const uid = `STU${student.id}`;
            const existingUser = await User.findByPk(uid);
            
            if (!existingUser) {
                await User.create({
                    uid,
                    name: student.name,
                    email: student.email || `STU${student.id}@institution.edu`,
                    password: hashedPassword,
                    role: 'student',
                    deptId: student.deptId,
                    subDepartment: student.subDepartmentId?.toString(),
                    status: 'active'
                });
                createdCount++;
            } else {
                existedCount++;
            }
        }
        
        console.log(`[SYNC] Backfill complete. Created: ${createdCount}, Already Existed: ${existedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('[SYNC] Failure during identity backfill:', error);
        process.exit(1);
    }
}

backfillStudentUsers();
