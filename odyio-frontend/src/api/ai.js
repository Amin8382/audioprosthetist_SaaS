import axios from 'axios';

const ai = axios.create({
  baseURL: import.meta.env.VITE_AI_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

ai.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('AI Service Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default ai;

export const analyzeAudiogram = (data) =>
  ai.post('/audiogram/analyze', data);

export const predictAppareil = (data) =>
  ai.post('/audiogram/predict-appareil', data);

export const optimizeParameters = (data) =>
  ai.post('/audiogram/optimize', data);

export const extractText = (formData) =>
  ai.post('/documents/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const verifyCnamDossier = (data) =>
  ai.post('/cnam/verify', data);

export const predictCnamReimbursement = (data) =>
  ai.post('/cnam/predict-reimbursement', data);

export const getAiHealth = () =>
  ai.get('/health');
