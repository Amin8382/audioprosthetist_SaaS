import { useQuery } from '@tanstack/react-query'
import { getClinics } from '../../api/clinicApi'
import { getClinicDisplayName } from '../../types/clinic'
import { useSelectedClinic } from '../store/selectedClinicStore'

export function useActiveClinic() {
  const { selectedClinicId, setSelectedClinicId, clearSelectedClinic } = useSelectedClinic()
  const clinicsQuery = useQuery({ queryKey: ['clinics'], queryFn: getClinics })
  const selectedClinic = (clinicsQuery.data ?? []).find((clinic) => clinic.id === selectedClinicId)

  return {
    selectedClinicId,
    selectedClinic,
    selectedClinicName: selectedClinic ? getClinicDisplayName(selectedClinic) : '',
    activeClinic: selectedClinic
      ? {
          clinicId: selectedClinic.id,
          clinicName: getClinicDisplayName(selectedClinic),
        }
      : undefined,
    clinics: clinicsQuery.data ?? [],
    clinicsQuery,
    setSelectedClinicId,
    clearSelectedClinic,
  }
}
