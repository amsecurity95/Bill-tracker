const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.db');

let db = null;

const init = () => {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            
            console.log('Connected to SQLite database');
            
            // Create tables
            createTables()
                .then(() => createDefaultAdmin())
                .then(() => resolve())
                .catch(reject);
        });
    });
};

const createTables = () => {
    return new Promise((resolve, reject) => {
        const queries = [
            // Blog Posts Table
            `CREATE TABLE IF NOT EXISTS blog_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                line TEXT,
                body TEXT NOT NULL,
                image TEXT,
                category TEXT,
                reading_time TEXT,
                trending INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                date TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Blog Categories Table
            `CREATE TABLE IF NOT EXISTS blog_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Form Submissions Table
            `CREATE TABLE IF NOT EXISTS form_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                name TEXT,
                email TEXT,
                phone TEXT,
                data TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Users Table (for admin)
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Article Likes Table
            `CREATE TABLE IF NOT EXISTS article_likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article_id INTEGER NOT NULL,
                user_ip TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (article_id) REFERENCES blog_posts(id)
            )`,
            
            // Article Comments Table
            `CREATE TABLE IF NOT EXISTS article_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                comment TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (article_id) REFERENCES blog_posts(id)
            )`,
            
            // Statistics - Page Visits
            `CREATE TABLE IF NOT EXISTS page_visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page TEXT NOT NULL,
                user_ip TEXT,
                user_agent TEXT,
                referrer TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                date TEXT DEFAULT CURRENT_DATE
            )`,
            
            // Statistics - Clicks
            `CREATE TABLE IF NOT EXISTS page_clicks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page TEXT NOT NULL,
                element TEXT,
                user_ip TEXT,
                user_agent TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                date TEXT DEFAULT CURRENT_DATE
            )`,
            
            // Promo Countdown Settings
            `CREATE TABLE IF NOT EXISTS promo_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                end_date TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Waitlist Table
            `CREATE TABLE IF NOT EXISTS waitlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                project_interest TEXT,
                message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                date TEXT DEFAULT CURRENT_DATE
            )`
        ];
        
        let completed = 0;
        queries.forEach((query, index) => {
            db.run(query, (err) => {
                if (err) {
                    console.error(`Error creating table ${index}:`, err);
                    reject(err);
                    return;
                }
                completed++;
                if (completed === queries.length) {
                    console.log('All tables created successfully');
                    resolve();
                }
            });
        });
    });
};

const createDefaultAdmin = () => {
    return new Promise((resolve, reject) => {
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        
        // Check if admin exists
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row) {
                console.log('Default admin already exists');
                initializePromoSettings();
                resolve();
                return;
            }
            
            // Create default admin
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                db.run(
                    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                    [username, hash, 'admin'],
                    (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        console.log(`Default admin created: ${username}`);
                        initializePromoSettings();
                        resolve();
                    }
                );
            });
        });
    });
};

const initializePromoSettings = () => {
    return new Promise((resolve, reject) => {
        db.get('SELECT id FROM promo_settings', [], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row) {
                resolve();
                return;
            }
            
            // Set default promo end date to 30 days from now
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
            endDate.setHours(23, 59, 59, 999);
            
            db.run(
                'INSERT INTO promo_settings (end_date, active) VALUES (?, ?)',
                [endDate.toISOString(), 1],
                (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log('Promo settings initialized');
                    resolve();
                }
            );
        });
    });
};

const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
};

const close = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('Database connection closed');
                resolve();
            });
        } else {
            resolve();
        }
    });
};

module.exports = {
    init,
    getDb,
    close
};

