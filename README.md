# 🧠 ResearchMind: Multi-Agent AI Research System

ResearchMind is a powerful, asynchronous multi-agent research pipeline built with a **FastAPI** Python backend and a beautiful, modern **React (Vite)** frontend. It employs a team of specialized AI agents working collaboratively to automate deep web research, content extraction, and report generation.

## 🚀 Key Features

* **Four-Stage Agent Pipeline:**
  * 🔍 **Search Agent:** Uses the Tavily API to scour the web and gather highly relevant, up-to-date sources based on your topic.
  * 📖 **Reader Agent:** Visits the gathered URLs, bypasses noise, and scrapes the core text from web pages.
  * ✍️ **Writer Agent:** Synthesizes the extracted text into a cohesive, comprehensive draft research report.
  * 🧐 **Critic Agent:** Reviews the draft, ensures factual consistency, and provides objective feedback.
* **Open-Source LLM Backbone:** Powered by **LangChain**, running **Llama 3.3** via **Groq** for blazing-fast and highly cost-efficient inference.
* **Stunning UI/UX:** A modern, premium React frontend featuring:
  * A full glassmorphic authentication modal with tabs.
  * Live-streaming terminal logs showing agent collaboration in real-time.
  * Dynamic pipeline status indicators to track progress across the four agents.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Vite, Vanilla CSS (Glassmorphism design system)
* **Backend:** Python, FastAPI, Uvicorn, Server-Sent Events (SSE)
* **AI/Orchestration:** LangChain, Groq API (Llama 3), Tavily API (Search)

---

## 💻 Getting Started

### Prerequisites
* **Node.js** (v18+)
* **Python** (3.9+)
* API Keys for:
  * [Groq](https://console.groq.com/) (`GROQ_API_KEY`)
  * [Tavily](https://tavily.com/) (`TAVILY_API_KEY`)

### 1. Clone the Repository
```bash
git clone https://github.com/JanviSingh812/Multi-Agent-Research-System.git
cd Multi-Agent-Research-System
```

### 2. Backend Setup
The backend runs the LangChain pipeline and FastAPI server.

```bash
# Install Python dependencies
pip install -r requirements.txt

# Set up your environment variables
# You can set these in your terminal or create a .env file in the root
export GROQ_API_KEY="your_groq_api_key"
export TAVILY_API_KEY="your_tavily_api_key"

# Run the FastAPI server (runs on http://localhost:8000)
python backend/main.py
```

### 3. Frontend Setup
The frontend is a Vite-powered React application.

```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server (runs on http://localhost:5173)
npm run dev
```

### 4. Running the App
1. Open your browser and navigate to `http://localhost:5173`.
2. Enter a topic in the search bar (e.g., "CRISPR gene editing" or "LLM Agents 2025").
3. Click **Run Research Pipeline** and watch the agents collaborate in real-time!


