# Attack Demonstrations Documentation
## Security Vulnerability Analysis

---

## Overview

This folder contains **attack demonstrations** that show security vulnerabilities in protocols **without forward secrecy**. These demonstrations serve educational and research validation purposes, proving:

1. Why forward secrecy is critical
2. How MITM attacks can be detected (or succeed without proper defenses)
3. Real-world impact of security design choices

### ⚠️ Important Note

This folder contains a **vulnerable version** of the protocol (without forward secrecy) specifically for demonstrating attacks. **DO NOT** use this code in production. Use **Folder 07** for secure implementation.

---

## Attack Scenarios

### Attack 1: Active MITM - Parameter Modification
### Attack 2: Active MITM - Authentication Forgery
### Attack 3: Active MITM - Session Key Replacement
### Attack 4: Passive Interception + Key Compromise (Forward Secrecy Attack)

---

## Attack 1: M1 Parameter Modification

**File**: `active_mitm_attack.py` (Test 1)

### Attack Description

Attacker intercepts M1 and modifies the target sensor ID (SID) to redirect authentication to a different sensor.

### Attack Code

```python
def attempt_m1_modification(M1_original):
    print("🔴 MITM ATTACK: Modifying SID in M1")
    
    # Intercept M1
    M1_modified = M1_original.copy()
    
    # Replace SID with different sensor
    M1_modified['SID'] = os.urandom(16)  # Target different sensor
    
    # Keep alpha unchanged (attacker can't recompute without k)
    
    return M1_modified
```

### Expected Result: ✅ BLOCKED

**Why It Fails**:
```python
# Gateway verification
b_i_prime = N ⊕ h16(k)
alpha_prime = h(b_i_prime + k + DID + modified_SID)  # Different SID
assert alpha_prime == alpha  # ❌ FAILS - alphas don't match
```

**Output**:
```
🔴 MITM Attack Attempt #1: Modify M1 Parameters
[MITM] Intercepted M1 from User...
[MITM] Original SID: 3a7b2c...
[MITM] Modified SID: 9f4e1d...
[Gateway] Verifying alpha...
[Gateway] ❌ Authentication failed - alpha mismatch
[Gateway] Possible MITM attack detected!

✅ DEFENSE SUCCESSFUL: Parameter modification blocked
```

### Security Lesson

**Integrity Protection**: Alpha cryptographically binds all M1 parameters. Any modification is detected during verification.

**Technical Explanation**:
- Alpha is computed as: alpha = h(b_i || k || DID || SID)
- If attacker changes SID to SID', gateway computes: alpha' = h(b_i || k || DID || SID')
- Since SID ≠ SID', we have alpha ≠ alpha'
- Gateway rejects authentication

---

## Attack 2: Authentication Forgery (Alpha Forgery)

**File**: `active_mitm_attack.py` (Test 2)

### Attack Description

Attacker attempts to forge a valid authentication parameter (alpha) to impersonate a user without knowing the secret key k.

### Attack Code

```python
def attempt_m1_alpha_modification(M1_original):
    print("🔴 MITM ATTACK: Forging Alpha Parameter")
    
    # Intercept M1
    M1_modified = M1_original.copy()
    
    # Try to forge new alpha
    M1_modified['alpha'] = os.urandom(32)  # Random alpha
    
    return M1_modified
```

### Expected Result: ✅ BLOCKED

**Why It Fails**:
```python
# Gateway verification
alpha_prime = h(b_i_prime + k + DID + SID)  # Needs secret k
assert alpha_prime == forged_alpha  # ❌ FAILS - attacker doesn't know k
```

**Output**:
```
🔴 MITM Attack Attempt #2: Forge Alpha Parameter
[MITM] Intercepted M1 from User...
[MITM] Original alpha: 5b3c8a...
[MITM] Forged alpha:   d9f2e1...
[Gateway] Verifying alpha...
[Gateway] ❌ Authentication failed - invalid alpha
[Gateway] User does not possess correct key k

✅ DEFENSE SUCCESSFUL: Authentication forgery blocked
```

### Security Lesson

**Cryptographic Authentication**: Without knowing k, attacker cannot compute valid alpha. This prevents impersonation attacks.

**Technical Explanation**:
- Computing valid alpha requires: alpha = h(b_i || k || DID || SID)
- Attacker knows: b_i (recovered from N), DID, SID (public in M1)
- Attacker does NOT know: k (secret key, derived from password + biometric)
- Probability of random guess matching: 2^-256 (infeasible)

---

## Attack 3: Session Key Replacement (M4 Modification)

**File**: `active_mitm_attack.py` (Test 3)

### Attack Description

Attacker intercepts M4 and replaces the encrypted session key (SKi) with attacker-controlled key, attempting to force user to use a known key.

### Attack Code

```python
def attempt_m4_modification(M4_original):
    print("🔴 MITM ATTACK: Replacing Session Key in M4")
    
    # Intercept M4
    M4_modified = M4_original.copy()
    
    # Replace SKi with attacker's key
    attacker_SK = os.urandom(16)
    attacker_SKi = (SID_new || attacker_SK || DID_new) ⊕ h(k_guessed)
    M4_modified['SKi'] = b64encode(attacker_SKi).decode()
    
    # Keep lambda unchanged (can't recompute without k)
    
    return M4_modified
```

### Expected Result: ✅ BLOCKED

**Why It Fails**:
```python
# User verification
SK_received = decrypt_SKi(M4_modified['SKi'])
lambda_prime = h(SK_received + DID + k + DID_new + SID_new)
assert lambda_prime == lambda  # ❌ FAILS - lambda computed with original SK
```

**Output**:
```
🔴 MITM Attack Attempt #3: Replace Session Key in M4
[MITM] Intercepted M4 from Gateway...
[MITM] Original SKi: e7d5a3...
[MITM] Modified SKi: 4b9c2f...
[User] Decrypting SKi...
[User] Verifying lambda...
[User] ❌ Lambda verification failed
[User] Possible MITM attack detected!

✅ DEFENSE SUCCESSFUL: Session key replacement blocked
```

### Security Lesson

**Cryptographic Binding**: Lambda cryptographically binds session key to authentication. Replacement detected during verification.

**Technical Explanation**:
- Lambda computed as: lambda = h(SK || DID || k || DID_new || SID_new)
- If attacker replaces SK with SK', user computes: lambda' = h(SK' || ...)
- Since SK ≠ SK', we have lambda ≠ lambda'
- User rejects M4

---

## Attack 4: Forward Secrecy Attack (Most Critical)

**File**: `mitm_forward_secrecy_attack.py`

### Attack Description

**Two-Phase Attack**:
1. **Phase 1 (Present)**: Attacker passively records all encrypted traffic
2. **Phase 2 (Future)**: Attacker compromises device, extracts long-term keys, decrypts recorded traffic

### Attack Scenario

**Setting**: Hospital IoT deployment (2024-2025)

**Phase 1 - Recording** (2024):
```python
class PassiveAttacker:
    def __init__(self):
        self.recorded_sessions = []
    
    def record_session(self):
        """Passively record all traffic (no modification)"""
        session = {
            "timestamp": "2024-01-15 10:30:00",
            "M1": {...},  # Includes N, alpha, DID, SID
            "M2": {...},  # Includes SKn, beta, C
            "M3": {...},  # Includes gamma
            "M4": {...},  # Includes SKi, lambda
            "encrypted_data": "U2FsYWRvIF9fXyBfXw=="  # Patient data
        }
        self.recorded_sessions.append(session)
        print("[ATTACKER] Session recorded (passive, undetected)")
```

**Phase 2 - Exploitation** (2025, months/years later):
```python
def exploit_compromised_keys():
    """Attacker compromises device, extracts keys"""
    
    # 1. Compromise device (physical access, malware, etc.)
    compromised_k = extract_key_from_device()  # Gets k
    print("[ATTACKER] Compromised device, extracted k")
    
    # 2. Retrieve recorded sessions
    for session in attacker.recorded_sessions:
        # 3. Derive session key from recorded messages
        SK = derive_session_key_without_forward_secrecy(
            session["M1"],
            session["M4"],
            compromised_k
        )
        
        # 4. Decrypt all recorded data
        plaintext = decrypt(session["encrypted_data"], SK)
        print(f"[ATTACKER] Decrypted: {plaintext}")
```

### How Attack Works (Without Forward Secrecy)

**Session Key Derivation** (Base Protocol):
```python
# Gateway generates SK (random)
SK = os.urandom(16)

# Encrypted in M4
SKi = (SID_new || SK || DID_new) ⊕ h(k)

# User decrypts
decrypted = SKi ⊕ h(k)
SK = decrypted[16:32]
```

**Attacker's Exploitation**:
```python
# Attacker has:
# - Recorded M4 (contains SKi)
# - Compromised k (from device)

# Attacker computes:
decrypted = SKi ⊕ h(compromised_k)
SK = decrypted[16:32]

# ❌ SUCCESS: Attacker recovered session key!
```

### Expected Result: ❌ ATTACK SUCCEEDS (Without Forward Secrecy)

**Output**:
```
📅 PHASE 1: Recording (January 2024)
[Hospital] Patient consultation in progress...
[Attacker] Recording session traffic (passive)...
[Attacker] Recorded M1, M2, M3, M4
[Attacker] Recorded encrypted patient data
[Attacker] Waiting for future compromise opportunity...

📅 PHASE 2: Exploitation (December 2025)
[Attacker] Compromised user device (physical access)
[Attacker] Extracted secret key k
[Attacker] Retrieving recorded sessions from January 2024...
[Attacker] Deriving session keys from recorded messages + k...
[Attacker] Session 1: SK = 7b3c8a9f...
[Attacker] Session 2: SK = 2d5e6f1a...
[Attacker] Decrypting recorded patient data...

❌ ATTACK SUCCEEDED:
   - Patient medical records exposed
   - Conversations between doctor and patient decrypted
   - Historical data compromised despite months passing
   
🔥 IMPACT: Complete loss of past communication confidentiality
```

### With Forward Secrecy (Folder 07)

**Session Key Derivation** (Enhanced Protocol):
```python
# User generates ephemeral keypair
user_private, user_public = generate_ephemeral_keypair()

# Gateway generates ephemeral keypair
gateway_private, gateway_public = generate_ephemeral_keypair()

# Both compute shared secret
shared_secret = compute_shared_secret(user_private, gateway_public)

# Session key from shared secret
SK = h(shared_secret)[:16]

# Delete ephemeral private keys
del user_private, gateway_private
```

**Attacker's Attempt**:
```python
# Attacker has:
# - Recorded messages (including ephemeral PUBLIC keys)
# - Compromised k (from device)

# Attacker tries:
user_public = extract_from_M1()
gateway_public = extract_from_M4()
shared_secret = compute_shared_secret(???, gateway_public)
#                                      ^^^
#                                      Need ephemeral PRIVATE key
#                                      Already deleted!

# ✅ ATTACK FAILS: Cannot recover ephemeral private keys
```

**Output** (With Forward Secrecy):
```
📅 PHASE 2: Exploitation Attempt (December 2025)
[Attacker] Compromised user device
[Attacker] Extracted secret key k
[Attacker] Attempting to derive session keys...
[Attacker] Found ephemeral public keys in recorded messages
[Attacker] ❌ Cannot compute shared secret (need private keys)
[Attacker] ❌ Ephemeral private keys were deleted after session
[Attacker] ❌ Cannot recover deleted keys from k

✅ DEFENSE SUCCESSFUL: Past sessions remain secure
   - Session keys cannot be derived from compromised k
   - Ephemeral private keys permanently deleted
   - Historical data protected
```

### Security Lesson

**Forward Secrecy is Critical**: Long-term key compromise should not expose past sessions.

**Technical Explanation**:

**Without Forward Secrecy**:
- SK depends only on k (long-term)
- Compromising k allows recovering all past SK
- Past encrypted data can be decrypted

**With Forward Secrecy**:
- SK depends on ephemeral ECDH shared secret
- Shared secret computed from ephemeral private keys
- Ephemeral private keys deleted after session
- Compromising k does NOT recover ephemeral private keys
- Cannot recover shared secret or SK
- Past encrypted data remains secure

---

## Running Attack Demonstrations

### Setup

```powershell
cd "08 Project_With_Attack\backend"
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Demo 1: Active MITM Attacks

```powershell
python active_mitm_attack.py
```

**What You'll See**:
- 🔴 Attack Attempt #1: M1 parameter modification → BLOCKED
- 🔴 Attack Attempt #2: Alpha forgery → BLOCKED
- 🔴 Attack Attempt #3: M4 session key replacement → BLOCKED
- ✅ Summary: All active attacks blocked by protocol defenses

**Educational Value**:
- Shows protocol successfully defends against active attacks
- Demonstrates integrity protection (alpha) and binding (lambda)
- Proves cryptographic authentication prevents forgery

### Demo 2: Forward Secrecy Attack

```powershell
python mitm_forward_secrecy_attack.py
```

**What You'll See**:
- 📅 Phase 1: Passive recording of encrypted sessions
- 📅 Phase 2: Key compromise and decryption attempt
- ❌ Attack succeeds: Past sessions decrypted
- 🔥 Impact: Historical data exposed

**Educational Value**:
- Demonstrates critical weakness without forward secrecy
- Shows why ephemeral keys are necessary
- Motivates enhancements in Folder 07

### Demo 3: Normal Protocol vs. Enhanced Protocol

```powershell
# Terminal 1: Run vulnerable protocol
python gateway_server.py
# ... complete authentication ...

# Terminal 2: Simulate compromise
python mitm_forward_secrecy_attack.py

# Compare with Folder 07
cd "..\07 Project Improvement and Attack\backend"
python test_forward_secrecy.py
```

**Comparison**:

| Protocol | Past Sessions After Compromise |
|----------|--------------------------------|
| **Folder 08 (Vulnerable)** | ❌ All sessions decrypted |
| **Folder 07 (Enhanced)** | ✅ All sessions secure |

---

## Educational Scenarios

### Scenario 1: Security Audit

**Use Case**: Demonstrate protocol vulnerabilities to justify improvements

**Steps**:
1. Run `active_mitm_attack.py` to show active attack defenses work
2. Run `mitm_forward_secrecy_attack.py` to show forward secrecy weakness
3. Present Folder 07 as solution with `test_forward_secrecy.py`

### Scenario 2: Research Validation

**Use Case**: Prove theoretical security claims with practical demonstrations

**Research Claims**:
- "Protocol resists active MITM attacks" → Demo 1 validates
- "Protocol lacks forward secrecy" → Demo 2 validates
- "Enhanced protocol provides forward secrecy" → Folder 07 tests validate

### Scenario 3: Student Education

**Use Case**: Teach cryptographic protocol design principles

**Learning Objectives**:
- Understand difference between active and passive attacks
- See real impact of missing forward secrecy
- Learn importance of ephemeral keys
- Compare vulnerable vs. secure implementations

---

## Attack Summary Table

| Attack | Method | Target | Result (Folder 08) | Result (Folder 07) | Defense Mechanism |
|--------|--------|--------|-------------------|-------------------|-------------------|
| **M1 Parameter Modification** | Active MITM | SID in M1 | ✅ Blocked | ✅ Blocked | Integrity via alpha |
| **Alpha Forgery** | Active MITM | Authentication | ✅ Blocked | ✅ Blocked | Cryptographic auth |
| **Session Key Replacement** | Active MITM | M4 SKi | ✅ Blocked | ✅ Blocked | Binding via lambda |
| **Forward Secrecy** | Passive → Compromise | Past Sessions | ❌ Succeeds | ✅ Blocked | Ephemeral ECDHE |

---

## Code Structure

### Attack Implementation Files

```
08 Project_With_Attack/backend/
├── active_mitm_attack.py              # Active MITM demonstrations
│   ├── attempt_m1_modification()      # Attack 1
│   ├── attempt_m1_alpha_modification() # Attack 2
│   └── attempt_m4_modification()      # Attack 3
│
├── mitm_forward_secrecy_attack.py     # Forward secrecy attack
│   ├── class PassiveAttacker          # Records sessions
│   ├── demonstrate_forward_secrecy_attack()
│   └── compare_with_forward_secrecy() # Shows Folder 07 defense
│
└── protocol/                           # Vulnerable protocol version
    ├── user_logic.py                   # No ephemeral keys
    ├── gateway_logic.py                # No ECDHE
    └── sensor_logic.py                 # Base implementation
```

---

## Real-World Analogies

### Attack 1-3: Active MITM

**Analogy**: Intercepting and modifying physical mail

**Without Defense**:
- Attacker opens envelope
- Changes destination address (Attack 1)
- Forges sender signature (Attack 2)
- Replaces contents (Attack 3)
- Victim has no way to detect tampering

**With Defense** (Our Protocol):
- Envelope sealed with wax stamp (alpha/lambda)
- Stamp includes all envelope details
- Opening and re-sealing breaks stamp
- Forgery impossible without secret seal
- Tampering immediately detected

### Attack 4: Forward Secrecy

**Analogy**: Lock and key vs. Temporary code

**Without Forward Secrecy** (Traditional Lock):
- House locked with physical key
- Records conversations inside house (encrypted)
- Years later, burglar steals key
- Burglar can't travel back in time... but...
- Burglar has recordings of encrypted conversations
- Uses stolen key to decrypt recordings
- Past conversations exposed

**With Forward Secrecy** (Temporary Code):
- House uses temporary keypad code
- Code changes after each entry
- Old codes deleted, can't be recovered
- Burglar steals master code
- But can't recover deleted temporary codes
- Past conversations remain secure

---

## Responsible Disclosure

### ⚠️ Ethical Guidelines

**This code is for**:
- ✅ Educational purposes
- ✅ Security research
- ✅ Vulnerability demonstration
- ✅ Protocol improvement validation

**This code is NOT for**:
- ❌ Attacking real systems
- ❌ Unauthorized access
- ❌ Exploiting vulnerabilities in production
- ❌ Any illegal activity

### Legal Notice

These demonstrations are provided for educational and research purposes only. Users are responsible for ensuring compliance with applicable laws and regulations. The authors assume no liability for misuse.

---

## Conclusion

This folder provides **practical demonstrations** of:

1. **Active MITM Attacks**: Protocol successfully defends against modification, forgery, and replacement attacks
2. **Forward Secrecy Attack**: Critical vulnerability without ephemeral keys
3. **Educational Value**: Clear comparison between vulnerable and secure implementations
4. **Research Validation**: Empirical evidence for theoretical security claims

**Key Takeaway**: Forward secrecy is not optional for healthcare IoT. Patient data confidentiality requires protection against future key compromise.

**Next Steps**:
- Use **Folder 05** for base implementation understanding
- Use **Folder 07** for production-ready secure implementation
- Use **Folder 08** for education and vulnerability demonstration

---

## References

1. Zhou, X., et al. (2024). "Security-Enhanced Lightweight and Anonymity-Preserving User Authentication Scheme for IoT-Based Healthcare." IEEE IoT Journal.

2. Dolev, D., & Yao, A. (1983). "On the Security of Public Key Protocols." IEEE Trans. Information Theory.

3. Diffie, W., & Hellman, M. (1976). "New Directions in Cryptography." IEEE Trans. Information Theory.

4. NIST SP 800-56A Rev. 3 (2018). "Recommendation for Pair-Wise Key-Establishment Schemes Using Discrete Logarithm Cryptography."
