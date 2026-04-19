import AdminTicketsRepository from "../repositories/AdminTicketsRepository";

class AdminTicketsService {
  async getDashboard() {
    const data = await AdminTicketsRepository.getDashboard();
    return {
      stats: data?.stats || { sold: 0, used: 0, revenue: 0 },
      students: Array.isArray(data?.students) ? data.students : [],
      history: Array.isArray(data?.history) ? data.history : [],
    };
  }
}

export default new AdminTicketsService();
