import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';

export default function ImageConverter() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const { addNotification } = useNotification();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setDownloadUrl(dataUrl);
        addNotification('图片转换成功', '已成功将图片转换为 JPG 格式');
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">本地图片转换工具</h3>
      <input type="file" accept="image/*" onChange={handleUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700" />
      {downloadUrl && (
        <div className="mt-4">
          <a href={downloadUrl} download="converted.jpg" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            下载转换后的图片
          </a>
        </div>
      )}
    </div>
  );
}
