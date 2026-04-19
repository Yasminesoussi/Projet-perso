// Service Admin: logique applicative simple autour du repository étudiants
import AdminStudentsRepository from "../repositories/AdminStudentsRepository";
import { getServerUrl } from "../utils/image";

class AdminStudentsService {
  async listPending() {
    const data = await AdminStudentsRepository.listPending();
    return data?.students || [];
  }
  async listPendingView() {
    const students = await this.listPending();
    const base = getServerUrl();
    return students.map((s) => ({
      ...s,
      id: s?._id,
      fullName: `${s?.firstName || ""} ${s?.lastName || ""}`.trim(),
      imageUri: s?.cardImage ? `${base}/uploads/${s.cardImage}` : null,
    }));
  }
  async approve(id) {
    if (!id) throw new Error("id requis");
    await AdminStudentsRepository.approve(id);
  }
  async reject(id) {
    if (!id) throw new Error("id requis");
    await AdminStudentsRepository.reject(id);
  }
}

export default new AdminStudentsService();
