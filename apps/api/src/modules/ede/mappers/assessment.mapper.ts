// ─── Assessment / AssessmentResult mapper ────────────────────
// RefAssessmentTypeId:
//   28 = Summative assessment
//   29 = Formative assessment

function mapTipoToAssessmentType(tipo: string): number {
  switch (tipo) {
    case 'PRUEBA':
    case 'EXAMEN':
    case 'TRABAJO': return 28; // Summative
    case 'TAREA':
    case 'EXPOSICION': return 29; // Formative
    default: return 28;
  }
}

export function mapEvaluacionToAssessment(evaluacion: any) {
  return {
    AssessmentId: `ASMT-${evaluacion.id}`,
    Name: evaluacion.nombre,
    RefAssessmentTypeId: mapTipoToAssessmentType(evaluacion.tipo),
    OrganizationId: `SEC-${evaluacion.cursoId}`,
    CourseOrganizationId: `COURSE-${evaluacion.asignaturaId}`,
  };
}

export function mapNotaToAssessmentResult(nota: any) {
  return {
    AssessmentResultId: `AR-${nota.id}`,
    PersonId: `P-${nota.alumnoId}`,
    AssessmentId: `ASMT-${nota.evaluacionId}`,
    ScoreValue: nota.valor,
    RefScoreMetricTypeId: 1, // numeric scale
    RecordEndDateTime: null,
  };
}
