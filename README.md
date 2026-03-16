# CredGuard

🛡 **CredGuard** is an educational cybersecurity web application designed to demonstrate how password strength is evaluated and how weak passwords can be exploited by attackers.

The system analyses passwords using entropy calculations, weak password detection, and attack simulations to help users understand the risks of insecure passwords.

CredGuard was developed as part of a **Cybersecurity university project** to demonstrate practical password analysis techniques and improve user awareness of password security.

---

# Project Overview

Passwords remain one of the most common authentication mechanisms used online, yet many users still choose weak or predictable passwords. CredGuard aims to highlight this problem by providing a tool that evaluates password strength and explains why certain passwords are vulnerable.

The application analyses passwords using multiple techniques including entropy scoring, dictionary detection, and checks against common password lists. It also includes demonstrations of attack techniques such as dictionary attacks and rainbow tables.

The goal of the project is to improve understanding of password security and demonstrate how weak passwords can be identified and exploited.

---

# Features

### Password Strength Analysis
CredGuard evaluates password strength using entropy calculations based on character variety and length.

### Weak Password Detection
The system checks passwords against a dataset of common passwords frequently found in data breaches.

### Dictionary Pattern Detection
Passwords derived from common words or predictable patterns are identified and flagged as weak.

### Crack Time Estimation
CredGuard estimates how long it would take an attacker to crack a password based on entropy calculations.

### Password Security Suggestions
The system provides suggestions to help users improve their password security.

### Password Attack Demonstrations
CredGuard includes educational demonstrations of:

- Dictionary attacks  
- Rainbow table attacks  
- Brute force techniques  
- Credential breach risks  

### Admin Analytics Dashboard
An admin dashboard provides anonymised statistics showing:

- Total password checks  
- Average entropy  
- Weak password percentage  
- Strength distribution analytics  

---

# Technologies Used

## Backend
- Python  
- Flask  
- SQLAlchemy  

## Frontend
- HTML  
- CSS  
- JavaScript  

## Security Libraries
- Werkzeug password hashing  
- Flask-WTF CSRF protection  

## Database
- SQLite

---

# Project Structure

CredGuard is built using a Flask web application architecture where the backend handles password analysis and the frontend provides the interactive user interface.

```
CredGuard
│
├── server.py
├── README.md
│
├── views
│   ├── base.html
│   ├── home.html
│   ├── strength_guide.html
│   ├── security_tips.html
│   ├── password_threats.html
│   ├── about.html
│   ├── accessibility.html
│   ├── privacy_policy.html
│   ├── dashboard.html
│   ├── admin_login.html
│   ├── admin_access.html
│   └── locked_out.html
│
├── assets
│   ├── style.css
│   └── script.js
│
├── data
│   ├── common_passwords.txt
│   └── dictionary.txt
│
├── instance
│   └── credguard.db
```

---

# Password Security Concepts Demonstrated

CredGuard demonstrates several important password security concepts including:

### Password Entropy
Entropy measures the unpredictability of a password based on length and character variety.

### Dictionary Attacks
Attackers test common words and predictable variations to compromise accounts.

### Rainbow Tables
Precomputed hash tables allow attackers to reverse weak password hashes quickly.

### Brute Force Attacks
Attackers systematically test password combinations until the correct password is found.

### Credential Breaches
Large datasets of leaked passwords are often reused by attackers to compromise accounts.

---

# Running the Project

### 1 Install Python
Ensure Python 3 is installed.

### 2 Install Dependencies

```
pip install flask flask_sqlalchemy flask_wtf
```

### 3 Run the Application

```
python server.py
```

### 4 Open the Website

```
http://127.0.0.1:5000
```

---

# Security Measures Implemented

CredGuard includes several defensive mechanisms including:

- CSRF protection  
- password hashing  
- session management  
- login attempt rate limiting  
- dictionary password detection  

Passwords entered into the system are not stored permanently, and all dashboard analytics are anonymised.

---

# Survey Research

As part of the project, a survey was conducted to understand how users perceive password security.

Results showed that:

- many users were unfamiliar with password strength testing tools  
- some users overestimated the strength of their passwords  
- most participants expressed interest in tools that could help identify weak passwords  

These findings influenced the design of CredGuard by focusing on usability and educational explanations.

---

# Future Improvements

Potential improvements to the project include:

- integration with larger breach datasets  
- password reuse detection  
- stronger hash analysis demonstrations  
- additional attack simulations  
- improved visual analytics for password trends  

---

# Author

Matthew Nichols  
Cybersecurity Student 

---

# License

This project is intended for **educational and demonstration purposes only**.
