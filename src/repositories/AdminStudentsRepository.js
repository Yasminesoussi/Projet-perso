// Repository Admin : ert à communiquer avec le backend (API) pour gérer les étudiants (côté admin
import apiClient from "./apiClient";

class AdminStudentsRepository {

   // récupérer les étudiants en attente
  async listPending() {
    const res = await apiClient.get("/admin/students/pending");
    return res.data;
  }

   // approuver un étudiant
  async approve(id) {
    await apiClient.post(`/admin/students/${id}/approve`);
  }

   // refuser un étudiant
  async reject(id) {
    await apiClient.post(`/admin/students/${id}/reject`);
  }
}

export default new AdminStudentsRepository();
