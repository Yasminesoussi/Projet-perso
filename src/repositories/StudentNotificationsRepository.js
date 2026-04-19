import studentApiClient from "./studentApiClient";

class StudentNotificationsRepository {
  async list() {
    const response = await studentApiClient.get("/students/notifications");
    return response.data;
  }

  async markRead(ids) {
    const response = await studentApiClient.post("/students/notifications/read", { ids });
    return response.data;
  }

  async dismiss(id) {
    const response = await studentApiClient.delete(`/students/notifications/${id}`);
    return response.data;
  }
}

export default new StudentNotificationsRepository();
