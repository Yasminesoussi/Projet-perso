import studentApiClient from "./studentApiClient";

class StudentOrdersRepository {
  async list() {
    const response = await studentApiClient.get("/students/orders");
    return response.data;
  }

  async confirmReceipt(orderId) {
    const response = await studentApiClient.post(`/students/orders/${orderId}/confirm-receipt`);
    return response.data;
  }
}

export default new StudentOrdersRepository();
