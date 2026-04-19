import studentApiClient from './studentApiClient';

class ReviewRepository {
  async listByPlatId(platId) {
    const res = await studentApiClient.get(`/reviews/plats/${platId}`);
    return res.data;
  }
  async create(platId, { rating, text }) {
    const res = await studentApiClient.post(`/reviews/plats/${platId}`, { rating, text });
    return res.data;
  }
}

export default new ReviewRepository();
