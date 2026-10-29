# Industrial Safety & AI Operations Platform

Unified multi-module industrial intelligence suite bringing together Computer Vision safety, manufacturing quality inspection, predictive machinery maintenance, fleet vehicle diagnostics, and semiconductor burn-in screening.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Python](https://img.shields.io/badge/python-3.11+-green)
![Node](https://img.shields.io/badge/node-18+-green)
![License](https://img.shields.io/badge/license-MIT-gray)

## Overview & Team Modules

This repository unifies 7 specialized industrial use cases into a single coordinated platform:

| Module | Feature Name | Description | Key Tech Stack |
|---|---|---|---|
| **1** | **PPE & Workplace Camera Safety** *(Lead)* | Real-time PPE compliance (helmets, vests, masks), restricted zone entry alerts, risk scoring, webcam/file/RTSP live stream, and incident audit lifecycle. | FastAPI, React, YOLOv8 (`Hansung-Cho/yolov8-ppe-detection`) |
| **2** | **DefectVision · Steel Surface Inspection** | Visual inspection and localization of 6 manufacturing steel defect classes: crazing, inclusion, patches, pitted surfaces, rolled-in scale, scratches. | YOLOv8n, OpenCV, PyTorch |
| **3** | **Vehicle & Fleet Fault Diagnosis** | OBD-II vehicle telemetry diagnosis into 8 fault classes with calibrated probability confidence, SHAP explanations, and alert persistence. | FastAPI Sub-App, Random Forest, Scikit-Learn |
| **4** | **AegisBurn AI · Semiconductor Screening** | Predictive burn-in degradation analysis for microelectronics, estimating 168-hour behavior and anomaly scores under high-temperature stress. | FastAPI, Isolation Forest, Random Forest Regressor |
| **5** | **FactoryMind AI · Machinery Optimization** | Equipment failure forecasting, sensor anomaly detection, health scoring, and prescriptive maintenance action recommendations. | LightGBM, XGBoost, Scikit-Learn |
| **6** | **Previsio · Failure Mechanism Diagnostics** | Root-cause failure diagnosis (Heat Dissipation, Tool Wear, Power, Overstrain) using AI4I industrial sensor telemetry. | Hist Gradient Boosting, Scikit-Learn |
| **7** | **Workplace Hazard & Batch Audit** | Batch inspection reports and audio alerting system for construction and factory environments. | YOLOv8, OpenCV, FastAPI |

---

## Unified Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Unified React + Tailwind Hub                              │
│                                                                                        │
│  [Overview]  [Live Cameras]  [Defect Vision]  [Car Faults]  [Burn-In]  [Predictive Maint]
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ REST API + WebSocket
┌──────────────────────────────────────────┴─────────────────────────────────────────────┐
│                                   FastAPI Master Host                                  │
│                                                                                        │
│  ├── /api/safety/...              (PPE & Restricted Zone Engine)                       │
│  ├── /api/defect-vision/...       (Steel Surface YOLOv8 Inference)                     │
│  ├── /api/aegis-burn/...          (Semiconductor Early-Burn-In Screening)              │
│  ├── /api/factorymind/...         (Fleet Health & Recommendation Engine)               │
│  ├── /api/previsio/...            (Root-Cause Sensor Telemetry Diagnostics)            │
│  └── /car-fault/ui/               (Vehicle Fault Diagnosis Embedded App)               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 18+

### 2. Backend Setup

```powershell
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Swagger UI**: http://127.0.0.1:8000/docs
- **Car Fault Sub-App**: http://127.0.0.1:8000/car-fault/ui/

### 3. Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

- **Unified Dashboard**: http://localhost:5173

### 4. Default Login Credentials

| Username | Password |
|---|---|
| `admin` | `admin123` |

---

## API Endpoints Summary

- **PPE Safety**:
  - `POST /api/sessions`: Start camera/video monitoring session
  - `WS /ws/monitoring/{id}`: Real-time incident stream
  - `GET /api/incidents`: Filter incidents and audit trail
- **DefectVision**:
  - `POST /api/defect-vision/detect`: Upload steel specimen image for defect detection
  - `GET /api/defect-vision/info`: Model metadata and defect classes
- **Car Fault**:
  - `POST /car-fault/api/v1/diagnose`: Single OBD-II telemetry diagnosis
  - `GET /car-fault/api/v1/simulate`: Live vehicle simulation stream
- **AegisBurn AI**:
  - `GET /api/aegis-burn/demo`: Cached 1,000 DUT demo run
  - `POST /api/aegis-burn/analyze`: Trigger ML burn-in anomaly screening
- **FactoryMind & Previsio**:
  - `GET /api/factorymind/fleet-status`: Factory fleet equipment overview
  - `POST /api/factorymind/predict`: Predict failure risk & maintenance recommendations
  - `POST /api/previsio/predict`: Physical sensor telemetry diagnostics


---

## 🚀 One-Click Cloud Deployment

This platform is configured for **1-click cloud deployment** on Render, Railway, or any Docker-compatible cloud host.

### Deploy on Render (Recommended & Free):

1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Blueprint**.
2. Connect your GitHub repository: https://github.com/nikhilappari/Industrial_AI_Platform.
3. Render will automatically detect 
ender.yaml and configure the service.
4. Click **Apply**.
5. Once built, you receive a public URL (e.g. https://industrial-ai-platform.onrender.com) serving the full React UI, APIs, and sub-apps!

### Deploy on Railway:

1. Go to [railway.app](https://railway.app) and click **New Project** -> **Deploy from GitHub repo**.
2. Select 
ikhilappari/Industrial_AI_Platform.
3. Railway will automatically build using the multi-stage Dockerfile.
4. Under **Settings** -> **Networking**, click **Generate Domain** to get your public HTTPS URL.
