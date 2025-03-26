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
//게시글 작성
app.post('/articles', authMiddleware, (req, res) => {
    const { title, content } = req.body;
    const user_id = req.user.id
    console.log(req.user.id)
    // 토큰이 유효하면 게시글 작성
    db.run(`INSERT INTO articles (title, content, user_id) VALUES (?, ? ,?)`,
        [title, content, user_id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // 게시글 작성이 성공하면 새 게시글 정보 반환
            res.json({ id: this.lastID, title, content, user_id });
        });
});


// 모든 게시글 조회 (로그인 불필요)
app.get('/articles', (req, res) => {
    const query = `
        SELECT articles.id, articles.title, articles.content, users.email 
        FROM articles
        JOIN users ON articles.user_id = users.id
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ articles: rows });
    });
});


// 특정 게시글 조회 (로그인 필요)
app.get("/articles/:id", (req, res) => {
    const articleId = req.params.id;  // URL에서 id 파라미터 추출

    const sql = `
        SELECT articles.id, articles.title, articles.content, users.email 
        FROM articles
        JOIN users ON articles.user_id = users.id 
        WHERE articles.id = ?
    `;

    db.get(sql, [articleId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(404).json('Article not found');
        }

        res.json(row);
    });
});




// 게시글 삭제 (로그인 및 본인 확인 필요)
app.delete('/articles/:id', authMiddleware, (req, res) => {
    const articleId = req.params.id;
    const userId = req.user.id;  // 로그인한 사용자의 ID (authMiddleware에서 설정된 사용자 정보)

    if (isNaN(articleId)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    // 게시글 작성자 확인
    const sql = 'SELECT user_id FROM articles WHERE id = ?';
    db.get(sql, [articleId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // 작성자와 로그인한 사용자가 같은지 확인
        if (row.user_id !== userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this article' });
        }

        // 작성자가 본인일 경우 삭제
        const deleteSql = 'DELETE FROM articles WHERE id = ?';
        db.run(deleteSql, [articleId], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Article not found' });
            }
            res.status(200).json({ message: 'Article deleted successfully' });
        });
    });
});


// 게시글 수정 (로그인 필요)
app.put('/articles/:id', authMiddleware, (req, res) => {
    const articleId = req.params.id;
    const { title, content } = req.body;
    const userId = req.user.id;  // 로그인한 사용자의 ID (authMiddleware에서 설정된 사용자 정보)

    if (isNaN(articleId)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    // 게시글 작성자 확인
    const sql = 'SELECT user_id FROM articles WHERE id = ?';
    db.get(sql, [articleId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }

        // 작성자와 로그인한 사용자가 같은지 확인
        if (row.user_id !== userId) {
            return res.status(403).json({ message: '본인만 수정할 수 있습니다.' });
        }

        // 작성자가 본인일 경우 수정
        const updateSql = `UPDATE articles SET title = ?, content = ? WHERE id = ?`;
        db.run(updateSql, [title, content, articleId], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
            }
            res.status(200).json({ message: '게시글이 성공적으로 수정되었습니다.' });
        });
    });
});


app.post('/articles/:id/comments', authMiddleware, (req, res) => {
    const article_id = req.params.id;
    const content = req.body.content;
    const user_id = req.user.id;  // 수정: req.user.id로 변경

    if (!content) {
        return res.status(400).json({ error: '댓글 내용을 입력하세요.' });
    }

    let sql = `INSERT INTO comments (content, article_id, user_id) VALUES (?, ?, ?)`;
    db.run(sql, [content, article_id, user_id], function (err) {
        if (err) {
            return res.status(500).json({ error: '댓글 저장 중 오류 발생' });
        }
        res.status(201).json({ message: '댓글이 등록되었습니다.', comment_id: this.lastID, user_id: user_id });
    });
});

// 특정 게시글의 모든 댓글 조회 (댓글 작성자 이메일 포함)
app.get('/articles/:id/comments', (req, res) => {
    let article_Id = req.params.id;
    let sql = `
        SELECT comments.*, users.email 
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.article_id = ?
    `;
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