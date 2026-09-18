type AppointmentLike = {
  staffId?: number | null;
};

/**
 * Client-side "Mijn afspraken"-check: een afspraak is van de huidige medewerker
 * wanneer hij aan diens user-id is toegewezen. Niet-toegewezen afspraken
 * (Geen voorkeur) horen nooit bij iemand.
 */
export function isMyAppointment<T extends AppointmentLike>(appointment: T, userId: number | null | undefined): boolean {
  if (!userId) return false;
  return appointment.staffId === userId;
}