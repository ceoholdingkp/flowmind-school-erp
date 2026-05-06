// ─── Organization mappers ────────────────────────────────────
// RefOrganizationTypeId:
//   10 = K12School
//   21 = Course
//   22 = CourseSection
//   40 = Nivel
//   46 = Grado

export function mapEstablecimientoToOrganization(est: any) {
  return {
    OrganizationId: `ORG-${est.id}`,
    Name: est.nombre,
    RefOrganizationTypeId: 10, // K12School
    Identifier: est.rbd,
  };
}

export function mapAsignaturaToOrganization(asig: any) {
  return {
    OrganizationId: `COURSE-${asig.id}`,
    Name: asig.nombre,
    RefOrganizationTypeId: 21, // Course
    SCEDCourseCode: asig.codigo ?? null,
    HoursPerTerm: asig.horasSemanales ?? null,
  };
}

export function mapCursoToOrganization(curso: any, orgId: string) {
  return {
    OrganizationId: `SEC-${curso.id}`,
    Name: curso.nombre,
    RefOrganizationTypeId: 22, // CourseSection
    ParentOrganizationId: orgId,
    FirstInstructionDate: `${curso.anio}-03-01`,
    LastInstructionDate: `${curso.anio}-12-15`,
  };
}

// RefGradeLevelId: simple year-based mapping
export function mapNivelToGrade(nivel: string): number {
  const map: Record<string, number> = {
    'PRE-KINDER': 1, 'KINDER': 2,
    '1° BÁSICO': 3, '2° BÁSICO': 4, '3° BÁSICO': 5, '4° BÁSICO': 6,
    '5° BÁSICO': 7, '6° BÁSICO': 8, '7° BÁSICO': 9, '8° BÁSICO': 10,
    '1° MEDIO': 11, '2° MEDIO': 12, '3° MEDIO': 13, '4° MEDIO': 14,
  };
  return map[nivel.toUpperCase()] ?? 3;
}
