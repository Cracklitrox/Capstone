import apiClient from '@/lib/apiClient';

// ==================== NOTIFICACIONES EN TIEMPO REAL ====================

export async function createNotification(notificationData) {
  const response = await apiClient.post('/notifications', notificationData);
  return response.data;
}

export async function getUserNotifications(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.archived !== undefined) params.append('archived', filters.archived);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await apiClient.get(`/notifications?${params.toString()}`);
  return response.data;
}

export async function markNotificationAsRead(notificationId) {
  const response = await apiClient.put(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markNotificationAsArchived(notificationId) {
  const response = await apiClient.put(`/notifications/${notificationId}/archive`);
  return response.data;
}

export async function unarchiveNotification(notificationId) {
  const response = await apiClient.put(`/notifications/${notificationId}/unarchive`);
  return response.data;
}

export async function deleteNotification(notificationId) {
  const response = await apiClient.delete(`/notifications/${notificationId}`);
  return response.data;
}

export async function getUnreadCount() {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data;
}

export async function markAllAsRead() {
  const response = await apiClient.put('/notifications/mark-all-read');
  return response.data;
}

export async function getUsersByRole(roleId) {
  const response = await apiClient.get(`/notifications/users-by-role/${roleId}`);
  return response.data;
}

export async function getNotificationReadStats(notificationId) {
  const response = await apiClient.get(`/notifications/${notificationId}/read-stats`);
  return response.data;
}

// ==================== ALERTAS ====================

export async function getAllAlertsCount() {
  const response = await apiClient.get('/notifications/alerts-count');
  return response.data;
}

// ==================== ALERTAS DE CHECK-OUT ====================

export async function fetchCheckoutAlerts() {
  const response = await apiClient.get('/notifications/checkout-alerts');
  return response.data;
}

export async function fetchCheckoutAlertsCount() {
  const response = await apiClient.get('/notifications/checkout-count');
  return response.data;
}

export async function fetchPastCheckouts(days = 7) {
  const response = await apiClient.get(`/notifications/past-checkouts?days=${days}`);
  return response.data;
}

export async function fetchFutureCheckouts(days = 7) {
  const response = await apiClient.get(`/notifications/future-checkouts?days=${days}`);
  return response.data;
}

export async function markCheckoutAlertsAsViewed() {
  const response = await apiClient.post('/notifications/checkout-alerts/mark-viewed');
  return response.data;
}

export async function hasUserViewedCheckoutsToday() {
  const response = await apiClient.get('/notifications/checkout-alerts/has-viewed');
  return response.data;
}
