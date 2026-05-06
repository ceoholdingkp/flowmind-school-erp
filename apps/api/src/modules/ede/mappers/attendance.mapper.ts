// ─── Attendance mapper ────────────────────────────────────────
// RefAttendanceStatusId:
//   1 = Present
//   2 = Unexcused Absence
//   3 = Excused Absence
//   4 = Late/Tardy

function mapEstadoToAttendanceStatus(estado: string): number {
  switch (estado) {
    case 'PRESENTE': return 1;
    case 'AUSENTE': return 2;
    case 'JUSTIFICADO': return 3;
    case 'ATRASO': return 4;
    case 'RETIRADO_ANTICIPADO': return 4;
    default: return 1;
  }
}

export function mapAsistenciaToAttendanceEvent(asistencia: any, alumnoId: string, seccionId: string) {
  return {
    PersonId: `P-${alumnoId}`,
    OrganizationId: seccionId,
    Date: new Date(asistencia.fecha).toISOString().split('T')[0],
    RefAttendanceStatusId: mapEstadoToAttendanceStatus(asistencia.estado),
    RefAttendanceEventTypeId: 1, // Daily attendance
    VirtualIndicator: false,
    RecordEndDateTime: null,
  };
}
