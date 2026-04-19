import apiClient from "./apiClient";

class AdminTicketsRepository {
  async getDashboard() {
    const response = await apiClient.get("/admin/tickets/dashboard");
    return response.data;
  }
}

export default new AdminTicketsRepository();
