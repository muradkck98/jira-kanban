import client from './client';

export interface TempUploadResult {
  url: string;
  filename: string;
  size: number;
  isImage: boolean;
}

export const uploadsAPI = {
  /**
   * Dosyayı MinIO'ya geçici olarak yükler (issue veya form kaydı olmadan).
   * Dönen URL'yi açıklama alanına veya başka bir alana eklemek için kullanılır.
   */
  uploadTemp: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<TempUploadResult>('/uploads/temp', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
