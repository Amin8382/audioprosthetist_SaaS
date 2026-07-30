export type Clinic = {
  id: string
  name: string
  active?: boolean
}

export function getClinicDisplayName(clinic: Clinic) {
  return clinic.name || 'Clinique sans nom'
}
