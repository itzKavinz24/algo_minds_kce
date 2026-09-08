import os
import subprocess
import requests

queries = [
    # 6 Core Hackathon Queries
    "Show monthly sales trend for the last year.",
    "Show revenue by category.",
    "What is total revenue this month?",
    "Show employee distribution by department.",
    "Why did sales decrease last month?",
    "Create an executive sales dashboard.",
    # Natural Speech Queries
    "Can you show me the monthly sales trend for the last twelve months?",
    "What's our total revenue for this month?",
    "Can you break down revenue by product category?",
    "Why did sales go down last month?"
]

print("="*70)
print("TESTING GROQ WHISPER SPEECH-TO-TEXT WITH REAL SYNTHESIZED AUDIO")
print("="*70)

for i, q in enumerate(queries, 1):
    wav_file = f"temp_query_{i}.wav"
    escaped_q = q.replace("'", "''")
    ps_cmd = f"""
    Add-Type -AssemblyName System.Speech
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $s.SetOutputToWaveFile('{wav_file}')
    $s.Speak('{escaped_q}')
    $s.Dispose()
    """
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], check=True)
    
    with open(wav_file, "rb") as f:
        res = requests.post(
            "http://localhost:8000/api/speech-to-text",
            files={"file": ("recording.wav", f, "audio/wav")}
        )
    
    data = res.json()
    print(f"[{i:02d}] Original   : '{q}'")
    print(f"     Groq STT   : '{data.get('text')}' (Success: {data.get('success')})")
    print("-" * 70)
    
    # Also test WebM Opus browser audio for the first query
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
        with open(webm_file, "rb") as f_webm:
            webm_res = requests.post(
                "http://localhost:8000/api/speech-to-text",
                files={"file": ("recording.webm", f_webm, "audio/webm")}
            )
        print(f"[*] WebM/Opus Browser Audio Test:")
        print(f"     Groq STT   : '{webm_res.json().get('text')}' (Success: {webm_res.json().get('success')})")
        print("-" * 70)
        if os.path.exists(webm_file):
            os.remove(webm_file)

    if os.path.exists(wav_file):
        os.remove(wav_file)
