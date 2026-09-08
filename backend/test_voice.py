import os
import subprocess
import time
import requests

queries = [
    # 6 Core Hackathon Queries
    "Show monthly sales trend for the last year.",
    "Show revenue by category.",
    "What is total revenue this month?",
    "Show employee distribution by department.",
    "Why did sales decrease last month?",
    "Create an executive sales dashboard.",
    # Natural Conversational Speech Queries
    "Can you show me the monthly sales trend for the last twelve months?",
    "Can you tell me what our total revenue is this month?",
    "Could you break down our revenue by product category?",
    "Why did our sales go down last month?",
    "Can you show the employee distribution across departments?"
]

print("="*75)
print("TESTING LOCAL FASTER-WHISPER (WHISPER LARGE-V3 TURBO ON GPU/CUDA)")
print("="*75)

# Check health first
health = requests.get("http://localhost:8000/api/health").json()
print("Engine       :", health.get("engine"))
print("Model        :", health.get("model"))
print("Hardware     :", f"{health.get('device', 'cpu').upper()} ({health.get('compute_type', 'int8')})")
print("Status       :", health.get("status"))
print("="*75)

for i, q in enumerate(queries, 1):
    wav_file = f"temp_test_{i}.wav"
    escaped_q = q.replace("'", "''")
    ps_cmd = f"""
    Add-Type -AssemblyName System.Speech
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $s.SetOutputToWaveFile('{wav_file}')
    $s.Speak('{escaped_q}')
    $s.Dispose()
    """
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], check=True)
    
    t0 = time.time()
    with open(wav_file, "rb") as f:
        res = requests.post(
            "http://localhost:8000/api/speech-to-text",
            files={"file": (wav_file, f, "audio/wav")}
        )
    elapsed = time.time() - t0
    
    data = res.json()
    print(f"[{i:02d}] Original : '{q}'")
    print(f"     Whisper  : '{data.get('text')}' (Time: {elapsed:.2f}s, Success: {data.get('success')})")
    print("-" * 75)
    
    # Test browser WebM Opus encoding for query 1
    if i == 1:
        import imageio_ffmpeg
        ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
        webm_file = "temp_browser.webm"
        subprocess.run(
            [ffmpeg_bin, "-y", "-i", wav_file, "-c:a", "libopus", webm_file],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        t_webm = time.time()
        with open(webm_file, "rb") as f_webm:
            webm_res = requests.post(
                "http://localhost:8000/api/speech-to-text",
                files={"file": ("recording.webm", f_webm, "audio/webm")}
            )
        elapsed_webm = time.time() - t_webm
        print(f"[*] Browser WebM Opus Format Test:")
        print(f"     Whisper  : '{webm_res.json().get('text')}' (Time: {elapsed_webm:.2f}s, Success: {webm_res.json().get('success')})")
        print("-" * 75)
        if os.path.exists(webm_file):
            os.remove(webm_file)

    if os.path.exists(wav_file):
        os.remove(wav_file)
