# 🔐 Enhanced IoMT Authentication Protocol with Forward Secrecy

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Security](https://img.shields.io/badge/Security-Curve25519-red.svg)](https://cr.yp.to/ecdh.html)

A secure three-factor authentication system for Internet of Medical Things (IoMT) environments, enhanced with **Hybrid Hierarchical ECDH** using **Curve25519** for forward secrecy.

![Protocol Demo](https://img.shields.io/badge/Status-Working-brightgreen)

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Security Properties](#-security-properties)
- [Installation](#-installation)
- [Usage](#-usage)
- [Testing](#-testing)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

This project implements and enhances Zhou et al.'s three-factor authentication protocol for IoMT environments. The enhancement addresses a critical security gap: **lack of forward secrecy**.

### The Problem

Original protocol session keys are derived from static credentials. If an attacker:
1. Records encrypted network traffic
2. Later compromises the gateway's credential database
3. They can decrypt **all historical communications**

### Our Solution

**Hybrid Hierarchical ECDH with Curve25519:**

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Device ↔ Gateway (Bounded Forward Secrecy)        │
│  • Daily ECDH key exchange                                  │
│  • Session keys via HKDF with fresh nonces                  │
│  • 24-hour protection window                                │
├─────────────────────────────────────────────────────────────┤
│  TIER 2: Gateway ↔ Cloud (Perfect Forward Secrecy)         │
│  • Per-session ECDH                                         │
│  • Full computational resources                             │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

- 🔑 **Curve25519 ECDH** - Fast, secure elliptic curve key exchange
- 🛡️ **Forward Secrecy** - Past sessions protected even if keys compromised
- 🚫 **MITM Resistance** - Authenticated ECDHE prevents key substitution
- 🔐 **Three-Factor Auth** - Password + Device + PUF
- ⚡ **Optimized for IoT** - Daily key amortization reduces overhead
- 🖥️ **React GUI** - Real-time protocol visualization
- 📊 **Live Logging** - Watch M1/M2/M3/M4 messages in real-time

## 🏗️ Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    User      │   UDP   │   Gateway    │   UDP   │   Sensor     │
│   Client     │◄───────►│   Server     │◄───────►│    Node      │
│              │         │              │         │              │
│ • Curve25519 │         │ • Curve25519 │         │ • PUF        │
│ • HKDF       │         │ • HKDF       │         │ • Challenge  │
│ • Password   │         │ • Credential │         │   Response   │
└──────────────┘         │   Storage    │         └──────────────┘
                         └──────────────┘
                                │
                         ┌──────────────┐
                         │  Flask API   │
                         │  Port 5000   │
                         └──────────────┘
                                │
                         ┌──────────────┐
                         │ React Frontend│
                         │  Port 5173   │
                         └──────────────┘
```

### Protocol Flow

```
User                          Gateway                         Sensor
  │                              │                              │
  │──── M1 {N,α,DID,SID,────────►│                              │
  │      nonce,Q_u}              │                              │
  │                              │──── M2 {SKn,β,C} ───────────►│
  │                              │                              │
  │                              │◄─── M3 {γ} ──────────────────│
  │◄─── M4 {SKi,λ,Q_g} ─────────│                              │
  │                              │                              │
  ▼                              ▼                              ▼
[SK derived via HKDF]    [Ephemeral keys deleted]    [SID rotated]
```

## 🔒 Security Properties

| Property | Status | Description |
|----------|--------|-------------|
| Forward Secrecy | ✅ | 24-hour bounded window protection |
| MITM Resistance | ✅ | Ephemeral keys authenticated in α/λ |
| Mutual Auth | ✅ | Both parties verified |
| User Anonymity | ✅ | Pseudonymous identifiers (DID) |
| Replay Protection | ✅ | Fresh nonces per session |
| Key Confirmation | ✅ | Lambda verification |

## 🚀 Installation

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/iomt-authentication.git
cd iomt-authentication/backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## 💻 Usage

### Start the Backend

```bash
cd backend
python api_server.py
```

Output:
```
[TCP] Gateway secure server listening on 127.0.0.1:8000
[UDP] Gateway insecure listener on 127.0.0.1:9000
 * Running on http://127.0.0.1:5000
```

### Start the Frontend

```bash
cd frontend
npm run dev
```

Output:
```
VITE v7.2.4  ready in 1151 ms
➜  Local:   http://localhost:5173/
```

### Using the Application

1. **Open** http://localhost:5173 in your browser
2. **Register Sensor**: Enter sensor ID → Click "Register Sensor"
3. **Register User**: Enter username/password → Click "Register User"
4. **Bind**: Select user and sensor → Click "Bind"
5. **Authenticate**: Enter credentials → Click "Authenticate"
6. **Watch**: Real-time logs show protocol messages

## 🧪 Testing

### Forward Secrecy Test

```bash
cd backend
python test_forward_secrecy.py
```

Expected output:
```
======================================================================
✓ ALL TESTS PASSED - HYBRID HIERARCHICAL CURVE25519 FS WORKING!
======================================================================

Security Properties Verified:
  ✓ Forward Secrecy - Ephemeral keys deleted after use
  ✓ Curve25519 - X25519 key exchange
  ✓ HKDF Binding - Session key derived with fresh nonce
  ✓ MITM Resistance - Ephemeral keys authenticated
```

### MITM Attack Test

```bash
python test_mitm_attack.py
```

Expected output:
```
🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒
MITM ATTACK RESISTANCE TEST
🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒

✅ MITM ATTACK BLOCKED!
✅ NORMAL AUTHENTICATION WORKS CORRECTLY
```

## 📡 API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sensor/register` | Register new sensor |
| POST | `/user/register` | Register new user |
| POST | `/bind` | Bind user to sensor |
| POST | `/authenticate` | Authenticate user to sensor |
| GET | `/sensors` | List all sensors |
| GET | `/users` | List all users |
| GET | `/logs` | Get protocol logs |

### Example: Register User

```bash
curl -X POST http://localhost:5000/user/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "secure123"}'
```

### Example: Authenticate

```bash
curl -X POST http://localhost:5000/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "secure123", "sensorId": "sensor-001"}'
```

## 📁 Project Structure

```
├── backend/
│   ├── api_server.py           # Flask REST API + Gateway
│   ├── gateway_server.py       # Standalone gateway server
│   ├── sensor_node.py          # Sensor simulation
│   ├── user_client.py          # User client
│   ├── requirements.txt        # Python dependencies
│   ├── test_forward_secrecy.py # Forward secrecy tests
│   ├── test_mitm_attack.py     # MITM resistance tests
│   ├── protocol/
│   │   ├── common.py           # Curve25519, HKDF, crypto primitives
│   │   ├── gateway_logic.py    # Gateway protocol logic
│   │   ├── sensor_logic.py     # Sensor protocol logic
│   │   └── user_logic.py       # User protocol logic
│   └── network/
│       ├── secure_channel.py   # TCP wrapper
│       └── insecure_channel.py # UDP wrapper
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   ├── App.css             # Styles
│   │   └── main.jsx            # Entry point
│   ├── package.json            # Node dependencies
│   └── vite.config.js          # Vite config
├── Documentation.md            # Full project documentation
└── README.md                   # This file
```

## 🔧 Key Components

### Cryptographic Functions

```python
# Curve25519 Key Generation
private_key, public_key = generate_curve25519_keypair()

# ECDH Shared Secret
shared_secret = compute_curve25519_shared_secret(private_key, peer_public)

# HKDF Session Key Derivation
session_key = derive_session_key(shared_secret, nonce, context)
```

### Security Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Curve | X25519 | ECDH key exchange |
| Hash | SHA-256 | HKDF, message authentication |
| Key Size | 256 bits | Session keys |
| Nonce Size | 128 bits | Session uniqueness |
| Daily Key Validity | 24 hours | Bounded FS window |

## 📈 Performance

| Operation | Time | Frequency |
|-----------|------|-----------|
| Curve25519 KeyGen | ~0.05 ms | 1/day |
| X25519 ECDH | ~0.15 ms | 1/day |
| HKDF-SHA256 | ~0.02 ms | per session |
| **Total Overhead** | **~0.02 ms/session** | - |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Zhou et al. for the original IoMT authentication protocol
- Daniel J. Bernstein for Curve25519
- The cryptography.io team for the Python cryptography library

## 📚 References

1. Y. Zhou et al., "A Secure Three-Factor Authentication Protocol for IoMT Based on PUF and Fuzzy Extractor," IEEE IoT Journal, 2024
2. D. J. Bernstein, "Curve25519: New Diffie-Hellman Speed Records," PKC 2006
3. H. Krawczyk and P. Eronen, "HKDF," RFC 5869, IETF, 2010

---

<p align="center">
  Made with ❤️ for IoMT Security
</p>
