# AGENTVERSE — Enterprise Analytics & Voice Platform

An enterprise analytics dashboard and multi-page executive PDF report generator powered by a local Analytics Agent and 100% local speech-to-text (Whisper Large-v3 Turbo).

---

## Prerequisites

1. **Python 3.10 to 3.12**
2. **Node.js 18+ & npm**
3. **Git**
4. *(Optional)* **NVIDIA GPU** with CUDA 12+ (Automatic CPU fallback included).

> **Zero API Keys Required**: This project does NOT require OpenAI, Groq, or any third-party cloud API keys. Everything runs locally on your machine.

---

## Quick Start (Step-by-Step)

### Step 1: Clone the Repository
`ash
git clone <YOUR_GITHUB_REPO_URL>
cd Algominds
`

### Step 2: Set Up the Python Backend

In a terminal in the project root:

1. **Create and activate a virtual environment**:
   - Windows:
     `powershell
     python -m venv venv
     .\venv\Scripts\activate
     `
   - macOS / Linux:
     `ash
     python3 -m venv venv
     source venv/bin/activate
     `

2. **Install Python dependencies**:
   `ash
   pip install -r requirements.txt
   `

3. **Start the Backend Server**:
   `ash
   cd backend
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   `
   > **Note on First Run**: On the first start, faster-whisper will automatically download the Whisper Large-v3 Turbo weights (~1.5 GB) from Hugging Face. Subsequent runs load from local disk.

### Step 3: Set Up the React Frontend

In a second terminal in the project root:

`ash
npm install
npm run dev
`

Open your browser at http://localhost:3000.

---

## Running Tests

`ash
python -m unittest discover -s report-generator/tests -v
`
