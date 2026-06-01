import os
import json
from datetime import datetime, date, timedelta

from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, jsonify, session, send_file
)
from flask_login import (
    LoginManager, login_user, logout_user, login_required,
    current_user, UserMixin
)
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
BASEDIR = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///" + os.path.join(BASEDIR, "dashboard.db")
)
uri = app.config["SQLALCHEMY_DATABASE_URI"]
if uri.startswith("postgres://"):
    app.config["SQLALCHEMY_DATABASE_URI"] = uri.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "index"
login_manager.login_message = "\u8bf7\u5148\u767b\u5f55\u540e\u518d\u8bbf\u95ee\u3002"

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    study_sessions = db.relationship("StudySession", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    finance_records = db.relationship("FinanceRecord", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    skill_records = db.relationship("SkillRecord", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    product_records = db.relationship("ProductRecord", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class StudySession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class FinanceRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    type = db.Column(db.String(10), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(60), nullable=False, default="")
    note = db.Column(db.Text, nullable=False, default="")

class SkillRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    hours = db.Column(db.Float, nullable=False, default=0.0)
    proficiency = db.Column(db.String(20), nullable=False, default="\u4e86\u89e3")
    link = db.Column(db.String(500), nullable=False, default="")
    note = db.Column(db.Text, nullable=False, default="")

class ProductRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    type = db.Column(db.String(20), nullable=False, default="\u5176\u4ed6")
    completed_date = db.Column(db.Date, nullable=True)
    link = db.Column(db.String(500), nullable=False, default="")
    description = db.Column(db.Text, nullable=False, default="")

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    password2 = data.get("password2") or ""
    if not email or not password:
        return jsonify({"ok": False, "message": "\u90ae\u7bb1\u548c\u5bc6\u7801\u4e0d\u80fd\u4e3a\u7a7a"}), 400
    if password != password2:
        return jsonify({"ok": False, "message": "\u4e24\u6b21\u5bc6\u7801\u8f93\u5165\u4e0d\u4e00\u81f4"}), 400
    if len(password) < 6:
        return jsonify({"ok": False, "message": "\u5bc6\u7801\u957f\u5ea6\u81f3\u5c116\u4f4d"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"ok": False, "message": "\u8be5\u90ae\u7bb1\u5df2\u88ab\u6ce8\u518c"}), 400
    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    login_user(user, remember=True)
    return jsonify({"ok": True, "message": "\u6ce8\u518c\u6210\u529f"})

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"ok": False, "message": "\u90ae\u7bb1\u6216\u5bc6\u7801\u9519\u8bef"}), 401
    login_user(user, remember=True)
    return jsonify({"ok": True, "message": "\u767b\u5f55\u6210\u529f"})

@app.route("/api/auth/logout", methods=["POST"])
@login_required
def api_logout():
    logout_user()
    return jsonify({"ok": True})

@app.route("/api/auth/me")
@login_required
def api_me():
    return jsonify({"ok": True, "email": current_user.email})

@app.route("/api/study/start", methods=["POST"])
@login_required
def api_study_start():
    sr = StudySession(user_id=current_user.id, start_time=datetime.utcnow(), end_time=datetime.utcnow(), duration_minutes=0)
    db.session.add(sr)
    db.session.commit()
    return jsonify({"ok": True, "session_id": sr.id, "start_time": sr.start_time.isoformat()})

@app.route("/api/study/end", methods=["POST"])
@login_required
def api_study_end():
    data = request.get_json()
    sr = StudySession.query.filter_by(id=data.get("session_id"), user_id=current_user.id).first()
    if not sr:
        return jsonify({"ok": False, "message": "\u672a\u627e\u5230\u5b66\u4e60\u8bb0\u5f55"}), 404
    et = datetime.fromisoformat(data["end_time"]).replace(tzinfo=None) if data.get("end_time") else datetime.utcnow()
    mins = max(1, int((et - sr.start_time).total_seconds() / 60))
    sr.end_time = et
    sr.duration_minutes = mins
    db.session.commit()
    return jsonify({"ok": True, "duration_minutes": mins})

@app.route("/api/study/stats")
@login_required
def api_study_stats():
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    today_m = db.session.query(func.coalesce(func.sum(StudySession.duration_minutes), 0)).filter(StudySession.user_id == current_user.id, StudySession.start_time >= today_start).scalar()
    month_m = db.session.query(func.coalesce(func.sum(StudySession.duration_minutes), 0)).filter(StudySession.user_id == current_user.id, StudySession.start_time >= month_start).scalar()
    total_m = db.session.query(func.coalesce(func.sum(StudySession.duration_minutes), 0)).filter(StudySession.user_id == current_user.id).scalar()
    return jsonify({"ok": True, "today_minutes": today_m, "month_minutes": month_m, "total_minutes": total_m})

@app.route("/api/study/sessions")
@login_required
def api_study_sessions():
    sessions = StudySession.query.filter_by(user_id=current_user.id).order_by(StudySession.start_time.desc()).limit(10).all()
    return jsonify({"ok": True, "sessions": [{"id": s.id, "start_time": s.start_time.isoformat(), "end_time": s.end_time.isoformat(), "duration_minutes": s.duration_minutes} for s in sessions]})

@app.route("/api/finance", methods=["GET", "POST"])
@login_required
def api_finance():
    if request.method == "GET":
        records = FinanceRecord.query.filter_by(user_id=current_user.id).order_by(FinanceRecord.date.desc()).all()
        return jsonify({"ok": True, "records": [{"id": r.id, "date": r.date.isoformat(), "type": r.type, "amount": r.amount, "category": r.category, "note": r.note} for r in records]})
    data = request.get_json()
    try:
        rd = datetime.strptime(data["date"], "%Y-%m-%d").date()
    except (KeyError, ValueError):
        rd = date.today()
    rec = FinanceRecord(user_id=current_user.id, date=rd, type=data.get("type", "expense"), amount=float(data.get("amount", 0)), category=data.get("category", ""), note=data.get("note", ""))
    db.session.add(rec)
    db.session.commit()
    return jsonify({"ok": True, "message": "\u5df2\u6dfb\u52a0", "id": rec.id})

@app.route("/api/finance/<int:record_id>", methods=["PUT", "DELETE"])
@login_required
def api_finance_item(record_id):
    rec = FinanceRecord.query.filter_by(id=record_id, user_id=current_user.id).first()
    if not rec:
        return jsonify({"ok": False, "message": "\u8bb0\u5f55\u4e0d\u5b58\u5728"}), 404
    if request.method == "DELETE":
        db.session.delete(rec)
        db.session.commit()
        return jsonify({"ok": True})
    data = request.get_json()
    try:
        rec.date = datetime.strptime(data["date"], "%Y-%m-%d").date()
    except (KeyError, ValueError):
        pass
    rec.type = data.get("type", rec.type)
    rec.amount = float(data.get("amount", rec.amount))
    rec.category = data.get("category", rec.category)
    rec.note = data.get("note", rec.note)
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/finance/summary")
@login_required
def api_finance_summary():
    now = datetime.utcnow()
    month_start = date(now.year, now.month, 1)
    all_recs = FinanceRecord.query.filter_by(user_id=current_user.id).all()
    total_balance = sum(r.amount if r.type == "income" else -r.amount for r in all_recs)
    month_income = sum(r.amount for r in all_recs if r.type == "income" and r.date >= month_start)
    month_expense = sum(r.amount for r in all_recs if r.type == "expense" and r.date >= month_start)
    return jsonify({"ok": True, "total_balance": round(total_balance, 2), "month_income": round(month_income, 2), "month_expense": round(month_expense, 2)})

@app.route("/api/skills", methods=["GET", "POST"])
@login_required
def api_skills():
    if request.method == "GET":
        skills = SkillRecord.query.filter_by(user_id=current_user.id).all()
        return jsonify({"ok": True, "skills": [{"id": s.id, "name": s.name, "hours": s.hours, "proficiency": s.proficiency, "link": s.link, "note": s.note} for s in skills]})
    data = request.get_json()
    skill = SkillRecord(user_id=current_user.id, name=data.get("name", ""), hours=float(data.get("hours", 0)), proficiency=data.get("proficiency", "\u4e86\u89e3"), link=data.get("link", ""), note=data.get("note", ""))
    db.session.add(skill)
    db.session.commit()
    return jsonify({"ok": True, "message": "\u5df2\u6dfb\u52a0", "id": skill.id})

@app.route("/api/skills/<int:skill_id>", methods=["PUT", "DELETE"])
@login_required
def api_skill_item(skill_id):
    skill = SkillRecord.query.filter_by(id=skill_id, user_id=current_user.id).first()
    if not skill:
        return jsonify({"ok": False, "message": "\u8bb0\u5f55\u4e0d\u5b58\u5728"}), 404
    if request.method == "DELETE":
        db.session.delete(skill)
        db.session.commit()
        return jsonify({"ok": True})
    data = request.get_json()
    skill.name = data.get("name", skill.name)
    skill.hours = float(data.get("hours", skill.hours))
    skill.proficiency = data.get("proficiency", skill.proficiency)
    skill.link = data.get("link", skill.link)
    skill.note = data.get("note", skill.note)
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/products", methods=["GET", "POST"])
@login_required
def api_products():
    if request.method == "GET":
        prods = ProductRecord.query.filter_by(user_id=current_user.id).all()
        return jsonify({"ok": True, "products": [{"id": p.id, "name": p.name, "type": p.type, "completed_date": p.completed_date.isoformat() if p.completed_date else "", "link": p.link, "description": p.description} for p in prods]})
    data = request.get_json()
    cd = None
    if data.get("completed_date"):
        try:
            cd = datetime.strptime(data["completed_date"], "%Y-%m-%d").date()
        except ValueError:
            pass
    prod = ProductRecord(user_id=current_user.id, name=data.get("name", ""), type=data.get("type", "\u5176\u4ed6"), completed_date=cd, link=data.get("link", ""), description=data.get("description", ""))
    db.session.add(prod)
    db.session.commit()
    return jsonify({"ok": True, "message": "\u5df2\u6dfb\u52a0", "id": prod.id})

@app.route("/api/products/<int:prod_id>", methods=["PUT", "DELETE"])
@login_required
def api_product_item(prod_id):
    prod = ProductRecord.query.filter_by(id=prod_id, user_id=current_user.id).first()
    if not prod:
        return jsonify({"ok": False, "message": "\u8bb0\u5f55\u4e0d\u5b58\u5728"}), 404
    if request.method == "DELETE":
        db.session.delete(prod)
        db.session.commit()
        return jsonify({"ok": True})
    data = request.get_json()
    prod.name = data.get("name", prod.name)
    prod.type = data.get("type", prod.type)
    if data.get("completed_date"):
        try:
            prod.completed_date = datetime.strptime(data["completed_date"], "%Y-%m-%d").date()
        except ValueError:
            pass
    else:
        prod.completed_date = None
    prod.link = data.get("link", prod.link)
    prod.description = data.get("description", prod.description)
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/export")
@login_required
def api_export():
    study = StudySession.query.filter_by(user_id=current_user.id).all()
    finance = FinanceRecord.query.filter_by(user_id=current_user.id).all()
    skills = SkillRecord.query.filter_by(user_id=current_user.id).all()
    prods = ProductRecord.query.filter_by(user_id=current_user.id).all()
    out = {
        "version": 1,
        "exported_at": datetime.utcnow().isoformat(),
        "study_sessions": [{"start_time": s.start_time.isoformat(), "end_time": s.end_time.isoformat(), "duration_minutes": s.duration_minutes} for s in study],
        "finance_records": [{"date": r.date.isoformat(), "type": r.type, "amount": r.amount, "category": r.category, "note": r.note} for r in finance],
        "skill_records": [{"name": s.name, "hours": s.hours, "proficiency": s.proficiency, "link": s.link, "note": s.note} for s in skills],
        "product_records": [{"name": p.name, "type": p.type, "completed_date": p.completed_date.isoformat() if p.completed_date else "", "link": p.link, "description": p.description} for p in prods],
    }
    return jsonify({"ok": True, "data": out})

@app.route("/api/import", methods=["POST"])
@login_required
def api_import():
    jd = request.get_json()
    if not jd or "data" not in jd:
        return jsonify({"ok": False, "message": "\u65e0\u6548\u7684\u6570\u636e\u683c\u5f0f"}), 400
    data = jd["data"]
    StudySession.query.filter_by(user_id=current_user.id).delete()
    FinanceRecord.query.filter_by(user_id=current_user.id).delete()
    SkillRecord.query.filter_by(user_id=current_user.id).delete()
    ProductRecord.query.filter_by(user_id=current_user.id).delete()
    for s in data.get("study_sessions", []):
        db.session.add(StudySession(user_id=current_user.id, start_time=datetime.fromisoformat(s["start_time"]).replace(tzinfo=None), end_time=datetime.fromisoformat(s["end_time"]).replace(tzinfo=None), duration_minutes=s["duration_minutes"]))
    for r in data.get("finance_records", []):
        db.session.add(FinanceRecord(user_id=current_user.id, date=datetime.strptime(r["date"], "%Y-%m-%d").date(), type=r["type"], amount=r["amount"], category=r.get("category", ""), note=r.get("note", "")))
    for s in data.get("skill_records", []):
        db.session.add(SkillRecord(user_id=current_user.id, name=s["name"], hours=s["hours"], proficiency=s.get("proficiency", "\u4e86\u89e3"), link=s.get("link", ""), note=s.get("note", "")))
    for p in data.get("product_records", []):
        cd = None
        if p.get("completed_date"):
            try:
                cd = datetime.strptime(p["completed_date"], "%Y-%m-%d").date()
            except ValueError:
                pass
        db.session.add(ProductRecord(user_id=current_user.id, name=p["name"], type=p.get("type", "\u5176\u4ed6"), completed_date=cd, link=p.get("link", ""), description=p.get("description", "")))
    db.session.commit()
    return jsonify({"ok": True, "message": "\u6570\u636e\u5bfc\u5165\u6210\u529f"})

@app.route("/api/clear", methods=["POST"])
@login_required
def api_clear():
    StudySession.query.filter_by(user_id=current_user.id).delete()
    FinanceRecord.query.filter_by(user_id=current_user.id).delete()
    SkillRecord.query.filter_by(user_id=current_user.id).delete()
    ProductRecord.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({"ok": True, "message": "\u6240\u6709\u6570\u636e\u5df2\u6e05\u7a7a"})

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, host="0.0.0.0", port=5000)