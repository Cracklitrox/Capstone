import apiClient from '@/lib/apiClient';

export async function getWhatsAppBookingAlerts(onlyUnviewed = false) {
  const params = new URLSearchParams();
  if (onlyUnviewed) {
    params.append('onlyUnviewed', 'true');
  }

  const response = await apiClient.get(
    `/whatsapp/booking-alerts${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
}

export async function markWhatsAppAlertsAsViewed() {
  const response = await apiClient.put('/whatsapp/mark-as-viewed', {});
  return response.data;
}

export async function rejectWhatsAppBookingAlert(alertId, reason = '') {
  const response = await apiClient.put(
    `/whatsapp/booking-alerts/${alertId}/reject`,
    { reason }
  );
  return response.data;
}

export async function confirmWhatsAppBookingAlert(alertId) {
  const response = await apiClient.put(
    `/whatsapp/booking-alerts/${alertId}/confirm`,
    {}
  );
  return response.data;
}

export async function deleteWhatsAppBookingAlert(alertId) {
  const response = await apiClient.delete(`/whatsapp/booking-alerts/${alertId}`);
  return response.data;
}

export async function deleteMultipleWhatsAppBookingAlerts(alertIds) {
  const response = await apiClient.post(
    '/whatsapp/booking-alerts/bulk-delete',
    { alertIds }
  );
  return response.data;
}
