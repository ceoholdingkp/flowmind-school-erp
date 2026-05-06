// ─── Person / PersonIdentifier mappers ───────────────────────

// RefSexId: 1=Male, 2=Female, 3=NotSelected
function mapSex(genero: string): number {
  if (genero === 'MASCULINO') return 1;
  if (genero === 'FEMENINO') return 2;
  return 3;
}

// PersonIdentificationSystem: 1=RUN, 7=IPE
export function mapAlumnoToPerson(alumno: any, orgId: string) {
  const personId = `P-${alumno.id}`;
  return {
    person: {
      PersonId: personId,
      FirstName: alumno.nombres,
      LastName: alumno.apellidoPaterno,
      MiddleName: alumno.apellidoMaterno ?? null,
      Birthdate: alumno.fechaNacimiento
        ? new Date(alumno.fechaNacimiento).toISOString().split('T')[0]
        : null,
      RefSexId: mapSex(alumno.genero),
    },
    personIdentifier: {
      PersonId: personId,
      Identifier: alumno.run,
      RefPersonIdentificationSystemId: 1, // RUN
    },
    orgPersonRole: {
      PersonId: personId,
      OrganizationId: orgId,
      RoleId: 6, // student
      EntryDate: alumno.fechaMatricula
        ? new Date(alumno.fechaMatricula).toISOString().split('T')[0]
        : null,
      ExitDate: alumno.fechaRetiro
        ? new Date(alumno.fechaRetiro).toISOString().split('T')[0]
        : null,
      RecordEndDateTime: null,
    },
  };
}

export function mapFuncionarioToPerson(func: any, orgId: string) {
  const personId = `S-${func.id}`;
  const nombre = func.nombres ?? '';
  const parts = nombre.trim().split(' ');
  return {
    person: {
      PersonId: personId,
      FirstName: parts[0] ?? '',
      LastName: func.apellidos ?? '',
      MiddleName: parts.slice(1).join(' ') || null,
      Birthdate: func.fechaNacimiento
        ? new Date(func.fechaNacimiento).toISOString().split('T')[0]
        : null,
      RefSexId: 3, // not specified
    },
    personIdentifier: {
      PersonId: personId,
      Identifier: func.run,
      RefPersonIdentificationSystemId: 1, // RUN
    },
    orgPersonRole: {
      PersonId: personId,
      OrganizationId: orgId,
      RoleId: 5, // staff
      EntryDate: func.fechaIngreso
        ? new Date(func.fechaIngreso).toISOString().split('T')[0]
        : null,
      ExitDate: null,
      RecordEndDateTime: null,
    },
  };
}
