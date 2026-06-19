import sqlite3
import os
import hashlib
from datetime import datetime
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "researchmind.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)
    
    # Create history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            topic TEXT NOT NULL,
            result TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    # A simple hash with salt for demonstration purposes
    salt = "researchmind_salt_812"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def create_user(email: str, password: str) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    pwd_hash = hash_password(password)
    try:
        cursor.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, pwd_hash))
        user_id = cursor.lastrowid
        conn.commit()
        return user_id
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    pwd_hash = hash_password(password)
    
    cursor.execute("SELECT id, email FROM users WHERE email = ? AND password_hash = ?", (email, pwd_hash))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None

def add_history(user_id: int, topic: str, result: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    timestamp = datetime.utcnow().isoformat()
    cursor.execute(
        "INSERT INTO history (user_id, topic, result, timestamp) VALUES (?, ?, ?, ?)",
        (user_id, topic, result, timestamp)
    )
    conn.commit()
    conn.close()

def get_history(user_id: int) -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, topic, result, timestamp FROM history WHERE user_id = ? ORDER BY timestamp DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# Initialize DB when this module is loaded
init_db()
