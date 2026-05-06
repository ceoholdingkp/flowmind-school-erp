// ─── Staff mappers ────────────────────────────────────────────
// RefK12StaffClassificationId: 1=Teacher, 2=Principal, 3=Support

function mapCargoToStaffClass(tipo: string, cargo: string): number {
  if (tipo === 'DIRECTIVO' || cargo?.toLowerCase().includes('director')) return 2;
  if (tipo === 'DOCENTE' || tipo === 'DOCENTE_JEFE') return 1;
  return 3; // Support
}

export function mapFuncionarioToStaffAssignment(func: any, orgId: string) {
  return {
    PersonId: `S-${func.id}`,
    OrganizationId: orgId,
    RefK12StaffClassificationId: mapCargoToStaffClass(func.tipo, func.cargo),
    StaffRole: func.cargo,
    ContractDaysOfServicePerYear: func.horasContrato ? Math.round(func.horasContrato * 45) : null,
    ItinerantTeacher: false,
  };
}

export function mapDocenteCursoToStaffSection(asigDoc: any) {
  return {
    PersonId: `S-${asigDoc.funcionarioId}`,
    CourseSectionId: `SEC-${asigDoc.cursoId}`,
    CourseOrganizationId: `COURSE-${asigDoc.asignaturaId}`,
    TeacherOfRecord: true,
  };
}
