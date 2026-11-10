import os
import re
import uuid
import asyncio
import subprocess
import shutil
import imageio_ffmpeg
from pypdf import PdfReader, PdfWriter

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
os.environ["PATH"] += os.pathsep + os.path.dirname(FFMPEG_EXE)

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yt_dlp

app = FastAPI(title="BTÜ Geçerken Lab API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

class DownloadRequest(BaseModel):
    url: str
    format: str

def sanitize_title(title: str) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "", title).strip()
    return cleaned if cleaned else "medya"

async def cleanup_file(path: str, delay: int = 600):
    await asyncio.sleep(delay)
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "BTÜ Geçerken Labs API",
        "ffmpeg": os.path.exists(FFMPEG_EXE)
    }

@app.post("/api/download")
async def handle_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    url = req.url.strip()
    target_format = req.format.lower()

    if not url:
        raise HTTPException(status_code=400, detail="Geçerli bir bağlantı girilmedi.")

    task_id = str(uuid.uuid4())[:8]

    # Sunucu IP bloklamalarına karşı modern Android/Web istemci argümanları
    common_opts = {
        'outtmpl': os.path.join(DOWNLOAD_DIR, f"{task_id}_%(title).50s.%(ext)s"),
        'quiet': True,
        'no_warnings': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web']
            }
        }
    }

    if target_format == "mp3":
        ydl_opts = {
            **common_opts,
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }],
        }
    else:
        ydl_opts = {
            **common_opts,
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'merge_output_format': 'mp4',
        }

    try:
        loop = asyncio.get_event_loop()

        def extract_and_download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filepath = ydl.prepare_filename(info)

                if target_format == "mp3":
                    filepath = os.path.splitext(filepath)[0] + ".mp3"
                else:
                    filepath = os.path.splitext(filepath)[0] + ".mp4"

                raw_title = sanitize_title(info.get("title", "medya"))
                ext = "mp3" if target_format == "mp3" else "mp4"
                final_filename = f"{raw_title}-btugecerkenlab.{ext}"
                final_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_{final_filename}")

                if os.path.exists(filepath):
                    os.rename(filepath, final_path)
                    filepath = final_path

                return filepath, raw_title

        file_path, title = await loop.run_in_executor(None, extract_and_download)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail="Dosya sunucuda derlenemedi.")

        background_tasks.add_task(cleanup_file, file_path, 600)
        filename = os.path.basename(file_path)

        return {
            "status": "success",
            "title": title,
            "download_url": f"/api/files/{filename}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İndirme motoru hatası: {str(e)}")

@app.post("/api/convert-audio")
async def convert_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    format: str = Form("mp3"),
    bitrate: str = Form("320")
):
    task_id = str(uuid.uuid4())[:8]
    clean_name = sanitize_title(os.path.splitext(file.filename)[0])
    in_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_in_{clean_name}.tmp")
    out_filename = f"{clean_name}-btugecerkenlab.{format.lower()}"
    out_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_{out_filename}")

    try:
        with open(in_path, "wb") as f:
            f.write(await file.read())

        cmd = [
            FFMPEG_EXE, "-y", "-i", in_path,
            "-vn", "-b:a", f"{bitrate}k",
            out_path
        ]

        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        background_tasks.add_task(cleanup_file, out_path, 600)
        return FileResponse(out_path, filename=out_filename, media_type="application/octet-stream")

    except subprocess.CalledProcessError as e:
        err = e.stderr.decode('utf-8', errors='ignore')
        raise HTTPException(status_code=500, detail=f"Ses dönüştürme başarısız: {err[-300:]}")
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)

@app.post("/api/downscale")
async def downscale_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    type: str = Form(...),
    target: str = Form(...)
):
    task_id = str(uuid.uuid4())[:8]
    clean_name = sanitize_title(os.path.splitext(file.filename)[0])
    in_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_in_{clean_name}.tmp")

    try:
        with open(in_path, "wb") as f:
            f.write(await file.read())

        if type == "video":
            out_filename = f"{clean_name}-btugecerkenlab.mp4"
            out_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_{out_filename}")
            
            # 16:9, 9:16 ve serbest oranlarda çift piksel ölçekleyici
            scale_filter = f"scale='if(gt(a,1),-2,trunc({target}*a/2)*2)':'if(gt(a,1),{target},-2)'"
            
            cmd = [
                FFMPEG_EXE, "-y", "-i", in_path,
                "-vf", scale_filter,
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast",
                "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out_path
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        else:
            # Ghostscript binary bağımlılığı yerine saf Python (pypdf) sıkıştırma
            out_filename = f"{clean_name}-btugecerkenlab.pdf"
            out_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_{out_filename}")

            reader = PdfReader(in_path)
            writer = PdfWriter()

            for page in reader.pages:
                page.compress_content_streams()
                writer.add_page(page)

            with open(out_path, "wb") as f_out:
                writer.write(f_out)

        background_tasks.add_task(cleanup_file, out_path, 600)
        return FileResponse(out_path, filename=out_filename, media_type="application/octet-stream")

    except subprocess.CalledProcessError as e:
        err = e.stderr.decode('utf-8', errors='ignore')
        raise HTTPException(status_code=500, detail=f"Sıkıştırma hatası: {err[-300:]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İşlem hatası: {str(e)}")
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)

@app.post("/api/upscale")
async def upscale_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    type: str = Form(...),
    factor: str = Form("2"),
    mode: str = Form("photo")
):
    task_id = str(uuid.uuid4())[:8]
    clean_name = sanitize_title(os.path.splitext(file.filename)[0])
    in_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_in_{clean_name}.tmp")

    try:
        with open(in_path, "wb") as f:
            f.write(await file.read())

        if type == "video":
            out_filename = f"{clean_name}-btugecerkenlab.mp4"
            out_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_{out_filename}")
            mult = 2 if factor == "2" else 4
            
            # Lanczos algoritması + Unsharp doku keskinleştirme filtresi
            vf_filter = f"scale=trunc(iw*{mult}/2)*2:trunc(ih*{mult}/2)*2:flags=lanczos,unsharp=5:5:0.8:5:5:0.0"

            cmd = [
                FFMPEG_EXE, "-y", "-i", in_path,
                "-vf", vf_filter,
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "veryfast",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                out_path
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        else:
            # Ghostscript sunucuda varsa 300 DPI upscale uygular, yoksa doğrudan koruyarak aktarır
            out_filename = f"{clean_name}-btugecerkenlab.pdf"
            out_path = os.path.join(DOWNLOAD_DIR, f"{task_id}_{out_filename}")
            
            gs_bin = shutil.which("gs")
            if gs_bin:
                cmd = [
                    gs_bin, "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4",
                    "-dPDFSETTINGS=/prepress", "-r300", "-dNOPAUSE", "-dQUIET", "-dBATCH",
                    f"-sOutputFile={out_path}", in_path
                ]
                subprocess.run(cmd, check=True)
            else:
                shutil.copy(in_path, out_path)

        background_tasks.add_task(cleanup_file, out_path, 600)
        return FileResponse(out_path, filename=out_filename, media_type="application/octet-stream")

    except subprocess.CalledProcessError as e:
        err = e.stderr.decode('utf-8', errors='ignore')
        raise HTTPException(status_code=500, detail=f"FFmpeg Upscale Hatası: {err[-300:]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upscale hatası: {str(e)}")
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)

@app.get("/api/files/{filename}")
async def serve_file(filename: str):
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı veya süresi dolduğu için silindi.")

    clean_dl_name = filename.split("_", 1)[-1] if "_" in filename else filename

    return FileResponse(
        path=file_path,
        filename=clean_dl_name,
        media_type='application/octet-stream'
    )