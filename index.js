const express = require('express');
const app = express();
const PORT = 3000;

// JSON 데이터를 파싱할 수 있도록 설정
app.use(express.json());

// CORS 문제 해결
const cors = require('cors');
app.use(cors());

// SQLite 데이터베이스 연결
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// JWT 및 암호화 관련 라이브러리 불러오기
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();
const secretKey = process.env.SECRET_KEY; // JWT 서명에 사용할 비밀키

// 서버 실행
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

// 인증 미들웨어 (JWT 토큰 검증)
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('인증 헤더 없음');
    }
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).send('토큰 검증 실패');
        }
        req.user = decoded; // JWT에서 사용자 정보 저장
        next();
    });
}

// 모든 게시글 조회 (로그인 불필요)
app.get('/articles', (req, res) => {
    db.all(`SELECT * FROM articles`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ articles: rows });
    });
});

// 특정 게시글 조회 (로그인 필요)
app.get('/articles/:id', authMiddleware, (req, res) => {
    let id = req.params.id;
    db.get(`SELECT * FROM articles WHERE id = ?`, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Article not found' });
        }
        res.json({ article: row });
    });
});

// 게시글 삭제 (로그인 및 본인 확인 필요)
app.delete('/articles/:id', authMiddleware, (req, res) => {
    const articleId = req.params.id;
    if (isNaN(articleId)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    const sql = 'DELETE FROM articles WHERE id = ?';
    db.run(sql, [articleId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.status(200).json({ message: 'Article deleted successfully' });
    });
});

// 게시글 수정 (로그인 필요)
app.put('/articles/:id', authMiddleware, (req, res) => {
    let id = req.params.id;
    let { title, content } = req.body;
    const sql = `UPDATE articles SET title = ?, content = ? WHERE id = ?`;
    db.run(sql, [title, content, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        res.status(200).json({ message: '게시글이 성공적으로 수정되었습니다.' });
    });
});

// 댓글 추가 (로그인 필요)
app.post('/articles/:id/comments', authMiddleware, (req, res) => {
    let article_id = req.params.id;
    let content = req.body.content;
    if (!content) {
        return res.status(400).json({ error: '댓글 내용을 입력하세요.' });
    }
    let created_at = new Date().toISOString();
    let sql = `INSERT INTO comments (content, created_at, article_id) VALUES (?, ?, ?)`;
    db.run(sql, [content, created_at, article_id], function (err) {
        if (err) {
            return res.status(500).json({ error: '댓글 저장 중 오류 발생' });
        }
        res.status(201).json({ message: '댓글이 등록되었습니다.', comment_id: this.lastID });
    });
});

// 특정 게시글의 모든 댓글 조회
app.get('/articles/:id/comments', (req, res) => {
    let article_Id = req.params.id;
    let sql = `SELECT * FROM comments WHERE article_id = ?`;
    db.all(sql, [article_Id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 회원가입
app.post('/users', (req, res) => {
    let { email, password } = req.body;
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, email, created_at: new Date().toISOString() });
        });
    });
});

// 로그인
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요.' });
    }
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: '이메일 없음.' });
        }
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (!isMatch) {
                return res.status(401).json({ message: '비밀번호가 틀림' });
            }
            const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '1h' });
            res.status(200).json({ message: "로그인 성공", token });
        });
    });
});