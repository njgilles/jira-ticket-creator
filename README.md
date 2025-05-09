# JIRA Ticket Generator
Give this app a simple task you are working on and build a JIRA story!

# Ollama 
Allows us to run models locally using our own hardware

Leverageing llama4 and mxbai-embed-large

---

## Application Overview

This application is a full-stack JIRA Story Generator and Estimator. It allows users to input a feature description and automatically generates a well-structured JIRA story, including Title, Description, Acceptance Criteria, and Definition of Done. It also estimates story points using an LLM.

### Features
- **JIRA Story Generation:** Enter a feature description and receive a complete JIRA story with all key sections.
- **Clarification Flow:** If the input is unclear, the app will prompt for clarification before generating a story.
- **Story Point Estimation:** Each generated story is automatically assigned a story point estimate (Fibonacci scale) with rationale.
- **Animal Avatars:** Each story card displays a randomly selected animal silhouette as an avatar.
- **Copy-to-Clipboard:** Easily copy any section of the generated story for use in other tools.
- **Modern UI:** Responsive, user-friendly interface with dialog pop-outs for full story details.

### Tech Stack
- **Frontend:** React, TypeScript, Material-UI
- **Backend:** Python, Flask, LangChain, Ollama LLM
- **Model:** llama3.1 (configurable)

### Setup & Usage

#### Prerequisites
- Node.js & npm
- Python 3.8+
- Ollama and required models (llama3.1, mxbai-embed-large)

#### 1. Backend
- Install Python dependencies:
  ```sh
  pip install -r requirements.txt
  ```
- Start the backend server:
  ```sh
  python main.py
  ```
  (or `python backend.py` if using the split backend)

#### 2. Frontend
- Install dependencies:
  ```sh
  cd frontend
  npm install
  ```
- Start the frontend:
  ```sh
  npm start
  ```
- The app will be available at [http://localhost:3000](http://localhost:3000)

#### 3. Usage
- Enter a feature description in the input box.
- If the prompt is clear, a JIRA story will be generated and displayed as a card.
- If clarification is needed, answer the follow-up question and resubmit.
- Click a story card to view full details, including Acceptance Criteria and Definition of Done.
- Story points are shown on each card.
- Use the copy buttons to copy any section.

### Customization
- You can add more animal SVGs in `frontend/src/assets/animals/`.
- The LLM prompt and model can be adjusted in `main.py`.

### Troubleshooting
- If you encounter issues with story generation or clarification, check the backend logs for LLM output and parsing details.
- For Git config issues on Windows, ensure your global config is at `C:\Users\<username>\.gitconfig` and no broken `.config/git/config` files exist.

---

For further questions or contributions, please open an issue or pull request.