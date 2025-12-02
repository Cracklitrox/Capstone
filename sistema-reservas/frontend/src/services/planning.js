import apiClient from "@/lib/apiClient";

export const getPlanningData = async (startDate, endDate) => {
  try {
    const response = await apiClient.get('/planning/tape-chart', {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    throw new Error("Error al obtener los datos de planning");
  }
};