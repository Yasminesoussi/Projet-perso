import StudentNotificationsRepository from "../repositories/StudentNotificationsRepository";

class StudentNotificationsService {
  async list() {
    const data = await StudentNotificationsRepository.list();
    return Array.isArray(data?.notifications) ? data.notifications : [];
  }

  async getUnreadCount() {
    const notifications = await this.list();
    return notifications.filter((item) => !item.read).length;
  }

  async markAllAsRead(notifications) {
    const ids = Array.isArray(notifications) ? notifications.map((item) => item.id) : [];
    if (!ids.length) return;
    await StudentNotificationsRepository.markRead(ids);
  }

  async dismiss(id) {
    if (!id) return;
    await StudentNotificationsRepository.dismiss(id);
  }
}

export default new StudentNotificationsService();
