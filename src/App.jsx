import { useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('準備就緒');

  // 1. 自動更新檢查邏輯（僅在 Tauri 桌面端生效）
  async function handleCheckUpdate() {
    try {
      setMessage('正在檢查更新...');
      const update = await check();
      if (update?.available) {
        setMessage(`發現新版本 v${update.version}，正在下載更新...`);
        await update.downloadAndInstall();
        await relaunch();
      } else {
        setMessage('目前已是最新版本');
      }
    } catch (e) {
      setMessage(`檢查更新出錯: ${e.message}`);
    }
  }

  // 2. 檔案轉檔邏輯（格式工廠核心：以影音轉檔為例）
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMessage('正在載入轉檔核心 (FFmpeg)...');

    try {
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setMessage('正在轉換檔案中...');
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      // 執行轉檔指令（例如：將上傳的影音轉為 mp3）
      await ffmpeg.exec(['-i', 'input.mp4', 'output.mp3']);

      const data = await ffmpeg.readFile('output.mp3');
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/mp3' }));

      // 自動觸發下載
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted_output.mp3';
      a.click();

      setMessage('轉換完成，已自動下載！');
    } catch (err) {
      setMessage(`轉檔失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>REOG 檔案格式轉換工具</h2>
      
      <div style={{ margin: '20px 0', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px' }}>
        <input type="file" onChange={handleFileChange} disabled={loading} />
        <p style={{ marginTop: '10px', color: '#666' }}>{message}</p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={handleCheckUpdate}
          style={{ padding: '10px 20px', background: '#0066ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          檢查軟體更新
        </button>
      </div>
    </div>
  );
}
