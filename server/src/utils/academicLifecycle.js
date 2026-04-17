import { models } from '../models/index.js';

const { Department, Program, Subject } = models;

export async function syncUniversityLifecycle(universityId) {
  if (!universityId) return null;

  const university = await Department.findOne({
    where: { id: universityId, type: 'universities' }
  });
  if (!university) return null;

  const programs = await Program.findAll({
    where: { universityId },
    attributes: ['status']
  });

  let nextStatus = university.status;

  if (programs.length === 0) {
    // Rule: No programs = Proposed (unless Inactive/Archived)
    if (university.status !== 'inactive') {
      nextStatus = 'proposed';
    }
  } else if (programs.some((p) => p.status === 'active')) {
    nextStatus = 'active';
  } else if (programs.some((p) => p.status === 'staged')) {
    nextStatus = 'staged';
  } else {
    nextStatus = 'draft';
  }

  if (nextStatus !== university.status) {
    await university.update({ status: nextStatus });
  }

  return nextStatus;
}

export async function syncProgramLifecycle(programId) {
  const program = await Program.findByPk(programId, {
    attributes: ['id', 'status', 'totalCredits', 'universityId']
  });
  if (!program) return null;

  if (program.status !== 'active') {
    const subjects = await Subject.findAll({
      where: { programId },
      attributes: ['credits']
    });

    const subjectCredits = subjects.reduce((sum, subject) => sum + (subject.credits || 0), 0);
    const isReadyForStaging =
      Number(program.totalCredits || 0) > 0 && subjectCredits >= Number(program.totalCredits || 0);
    const nextStatus = isReadyForStaging ? 'staged' : 'draft';

    if (program.status !== nextStatus) {
      await program.update({ status: nextStatus });
    }
  }

  await syncUniversityLifecycle(program.universityId);

  return program;
}
