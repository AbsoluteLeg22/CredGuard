import os
import math
import re
import hashlib
from datetime import datetime, timedelta

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__, template_folder="views", static_folder="assets", static_url_path="/assets")
app.secret_key = os.environ.get("SECRET_KEY", "dev_fallback_change_me")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///credguard.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(minutes=30)

db = SQLAlchemy(app)
csrf = CSRFProtect(app)

ADMIN_ACCESS_KEY = os.environ.get("ADMIN_ACCESS_KEY", "Cg_Adm1n!Access#2026")

MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 10

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
COMMON_PATH = os.path.join(DATA_DIR, "common_passwords.txt")
DICT_PATH = os.path.join(DATA_DIR, "dictionary.txt")

DEFAULT_COMMON_PASSWORDS = {
    "123456", "123456789", "password", "password123", "qwerty",
    "abc123", "admin", "letmein", "welcome", "football",
    "monkey", "dragon", "iloveyou", "login", "passw0rd"
}

DEFAULT_DICTIONARY_WORDS = {
    "password", "admin", "welcome", "football", "dragon",
    "monkey", "summer", "winter", "qwerty", "login", "secret"
}

def _load_wordset(path: str, fallback=None):
    fallback = fallback or set()
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            words = {line.strip().lower() for line in f if line.strip()}
            return words if words else fallback
    except FileNotFoundError:
        return fallback

COMMON_PASSWORDS = _load_wordset(COMMON_PATH, DEFAULT_COMMON_PASSWORDS)
DICTIONARY_WORDS = _load_wordset(DICT_PATH, DEFAULT_DICTIONARY_WORDS)

LEET_MAP = str.maketrans({
    "@": "a", "0": "o", "1": "i", "!": "i", "$": "s", "3": "e", "4": "a", "5": "s", "7": "t"
})

def normalize_password(pw: str) -> str:
    pw = (pw or "").strip().lower()
    pw = pw.translate(LEET_MAP)
    pw = re.sub(r"[^a-z0-9]", "", pw)
    return pw

def is_common_password(pw: str) -> bool:
    return (pw or "").strip().lower() in COMMON_PASSWORDS

def is_dictionary_based(pw: str) -> bool:
    n = normalize_password(pw)
    if not n:
        return False
    if n in DICTIONARY_WORDS:
        return True
    base = re.sub(r"\d+$", "", n)
    return bool(base and base in DICTIONARY_WORDS)

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def _parse_iso(dt_str: str):
    try:
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None

def is_locked_out() -> bool:
    lockout_until = session.get("lockout_until")
    if not lockout_until:
        return False

    until = _parse_iso(lockout_until)
    if not until:
        session.clear()
        return False

    if datetime.utcnow() < until:
        return True

    session.clear()
    return False

def register_failed_attempt():
    attempts = int(session.get("failed_attempts", 0)) + 1
    session["failed_attempts"] = attempts
    if attempts >= MAX_ATTEMPTS:
        session["lockout_until"] = (datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()

class PasswordCheck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entropy = db.Column(db.Float, nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AdminUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

with app.app_context():
    db.create_all()
    if not AdminUser.query.filter_by(username="admin").first():
        db.session.add(
            AdminUser(
                username="admin",
                password_hash=generate_password_hash("Adm1n!Secure2026")
            )
        )
        db.session.commit()

def calculate_entropy(password: str) -> float:
    password = password or ""
    if not password:
        return 0.0

    charset = 0
    if any(c.islower() for c in password):
        charset += 26
    if any(c.isupper() for c in password):
        charset += 26
    if any(c.isdigit() for c in password):
        charset += 10
    if any(not c.isalnum() for c in password):
        charset += 32

    if charset == 0:
        return 0.0

    entropy = len(password) * math.log2(charset)
    lowered = password.lower()
    normalized = normalize_password(password)

    very_common = {
        "password", "password123", "123456", "123456789",
        "qwerty", "admin", "abc123", "letmein"
    }

    patterns = ["password", "123", "1234", "12345", "qwerty", "admin", "abc"]

    if lowered in very_common or normalized in very_common:
        entropy -= 40

    for pattern in patterns:
        if pattern in lowered or pattern in normalized:
            entropy -= 12

    if lowered.isalpha() or lowered.isdigit():
        entropy -= 10

    if len(set(lowered)) <= 3:
        entropy -= 15

    if len(password) < 8:
        entropy -= 10

    if is_common_password(password):
        entropy -= 25

    if is_dictionary_based(password):
        entropy -= 20

    return round(max(entropy, 0), 2)

def rating_from_entropy(entropy: float, password: str = "") -> int:
    lowered = (password or "").lower()
    normalized = normalize_password(password)

    if (
        lowered in COMMON_PASSWORDS
        or normalized in COMMON_PASSWORDS
        or is_dictionary_based(password)
    ):
        return 1

    if entropy < 28:
        return 1
    if entropy < 45:
        return 2
    if entropy < 65:
        return 3
    if entropy < 85:
        return 4
    return 5

def estimate_crack_time(password: str, entropy: float) -> str:
    lowered = (password or "").lower()
    normalized = normalize_password(password)

    instantly_weak = {
        "password", "password123", "123456", "123456789",
        "qwerty", "admin", "abc123", "letmein"
    }

    if (
        lowered in instantly_weak
        or normalized in instantly_weak
        or is_common_password(password)
        or is_dictionary_based(password)
    ):
        return "Instantly"

    if entropy < 28:
        return "Instantly"
    if entropy < 36:
        return "A few seconds"
    if entropy < 45:
        return "A few minutes"
    if entropy < 55:
        return "A few hours"
    if entropy < 65:
        return "A few days"
    if entropy < 80:
        return "Months"
    return "Years"

def generate_suggestions(password: str):
    tips = []

    if len(password) < 12:
        tips.append("Use at least 12 characters.")
    if not any(c.isupper() for c in password):
        tips.append("Add uppercase letters.")
    if not any(c.islower() for c in password):
        tips.append("Add lowercase letters.")
    if not any(c.isdigit() for c in password):
        tips.append("Add numbers.")
    if not any(not c.isalnum() for c in password):
        tips.append("Add symbols.")
    if is_common_password(password):
        tips.append("This password matches a known common weak password.")
    if is_dictionary_based(password):
        tips.append("This password is based on a predictable word or pattern.")
    if password and len(set(password.lower())) <= 3:
        tips.append("Avoid repeated or highly predictable characters.")
    if not tips:
        tips.append("This password is stronger than the most common weak patterns.")

    return tips

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/strength-guide")
def strength_guide():
    return render_template("strength_guide.html")

@app.route("/security-tips")
def security_tips():
    return render_template("security_tips.html")

@app.route("/password-threats")
def password_threats():
    return render_template(
        "password_threats.html",
        common_count=len(COMMON_PASSWORDS),
        common_sample=list(COMMON_PASSWORDS)[:15]
    )

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/accessibility")
def accessibility():
    return render_template("accessibility.html")

@app.route("/privacy-policy")
def privacy_policy():
    return render_template("privacy_policy.html")

@app.route("/admin-login", methods=["GET", "POST"])
def admin_login():
    if is_locked_out():
        flash("Too many failed attempts. Try again later.")
        return render_template("locked_out.html")

    if not session.get("access_granted"):
        if request.method == "POST":
            key = (request.form.get("access_key") or "").strip()
            if key == ADMIN_ACCESS_KEY:
                session["access_granted"] = True
                session["failed_attempts"] = 0
                return redirect(url_for("admin_login"))
            register_failed_attempt()
            flash("Invalid access key.")
        return render_template("admin_access.html")

    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""
        admin = AdminUser.query.filter_by(username=username).first()
        if admin and check_password_hash(admin.password_hash, password):
            session["admin"] = True
            session["failed_attempts"] = 0
            return redirect(url_for("dashboard"))
        register_failed_attempt()
        flash("Invalid username or password.")

    return render_template("admin_login.html")

@app.route("/dashboard")
def dashboard():
    if not session.get("admin"):
        return redirect(url_for("admin_login"))

    total = PasswordCheck.query.count()
    avg_entropy = db.session.query(db.func.avg(PasswordCheck.entropy)).scalar() or 0
    weak_count = PasswordCheck.query.filter(PasswordCheck.rating <= 2).count()
    weak_percent = round((weak_count / total) * 100, 2) if total > 0 else 0

    distribution = {
        "Very Weak": PasswordCheck.query.filter_by(rating=1).count(),
        "Weak": PasswordCheck.query.filter_by(rating=2).count(),
        "Moderate": PasswordCheck.query.filter_by(rating=3).count(),
        "Strong": PasswordCheck.query.filter_by(rating=4).count(),
        "Very Strong": PasswordCheck.query.filter_by(rating=5).count(),
    }

    return render_template(
        "dashboard.html",
        total=total,
        avg_entropy=round(avg_entropy, 2),
        weak_percent=weak_percent,
        distribution=distribution
    )

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

@app.route("/analyze", methods=["POST"])
@csrf.exempt
def analyze():
    data = request.get_json() or {}
    password = data.get("password") or ""

    entropy = calculate_entropy(password)
    rating = rating_from_entropy(entropy, password)
    crack_time = estimate_crack_time(password, entropy)
    suggestions = generate_suggestions(password)

    db.session.add(PasswordCheck(entropy=entropy, rating=rating))
    db.session.commit()

    return jsonify({
        "rating": rating,
        "entropy": entropy,
        "crack_time": crack_time,
        "suggestions": suggestions
    })

@app.route("/preview-analyze", methods=["POST"])
@csrf.exempt
def preview_analyze():
    data = request.get_json() or {}
    password = data.get("password") or ""

    entropy = calculate_entropy(password)
    rating = rating_from_entropy(entropy, password)
    crack_time = estimate_crack_time(password, entropy)
    suggestions = generate_suggestions(password)

    return jsonify({
        "rating": rating,
        "entropy": entropy,
        "crack_time": crack_time,
        "suggestions": suggestions
    })

@app.route("/check-common", methods=["POST"])
@csrf.exempt
def check_common():
    data = request.get_json() or {}
    password = data.get("password") or ""

    common = is_common_password(password)
    dictionary_based = is_dictionary_based(password)

    if common:
        return jsonify({
            "status": "weak",
            "message": "This password matches a known common weak password."
        })

    if dictionary_based:
        return jsonify({
            "status": "warning",
            "message": "This password is based on a predictable dictionary word."
        })

    return jsonify({
        "status": "ok",
        "message": "This password was not found in the built-in weak password checks."
    })

@app.route("/rainbow-demo", methods=["POST"])
@csrf.exempt
def rainbow_demo():
    data = request.get_json() or {}
    password = data.get("password") or ""
    target_hash = sha256_hex(password)

    demo_words = [
        "123456",
        "password",
        "password123",
        "admin",
        "letmein",
        "welcome",
        "qwerty"
    ]

    steps = []

    for word in demo_words:
        current_hash = sha256_hex(word)
        match = current_hash == target_hash

        steps.append({
            "word": word,
            "hash": current_hash,
            "match": match
        })

        if match:
            return jsonify({
                "status": "compromised",
                "target_hash": target_hash,
                "matched_password": word,
                "steps": steps
            })

    return jsonify({
        "status": "safe",
        "target_hash": target_hash,
        "matched_password": None,
        "steps": steps
    })

if __name__ == "__main__":
    app.run(debug=True)