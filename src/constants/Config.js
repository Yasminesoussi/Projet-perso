import { Platform } from 'react-native';

export const SERVER_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
export const API_URL = `${SERVER_URL}/api`;
