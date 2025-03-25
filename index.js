const express = require('express');
const app = express();
const PORT = 3000;
// json으로 된 post의 바디를 읽기 
app.use(express.json())
//cors 문제해결
const cors = require('cors')
app.use(cors());
//json으로 된 post의 바디를 읽기 위해 필요
app.use(express.json())
//db연결
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const secretKey = 'mysecretkey'; // JWT 서명에 사용할 비밀키

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});






app.get('/articles', (req, res) => {
    // 모든 articles 데이터 가져오기
    db.all(`SELECT * FROM articles`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ articles: rows });
    });
});

app.get('/articles/:id', (req, res) => {
    let id = req.params.id;

    // 특정 id에 해당하는 article 가져오기
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

app.delete('/articles/:id', (req, res) => {
    const articleId = req.params.id;

    console.log(`Received request to delete article with ID: ${articleId}`); // 로그 추가

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


app.put('/articles/:id', (req, res) => {
    console.log(req.params.id)
    console.log(req.body.id)
    let id = req.params.id
    let { title, content } = req.body

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


// 서버 시작 시 commit 테이블 생성
// db.run(`CREATE TABLE IF NOT EXISTS commit (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     content TEXT NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     article_id INTEGER NOT NULL,
//     FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
// )`, (err) => {
//     if (err) {
//         console.error('commit 테이블 생성 중 오류 발생:', err.message);
//     } else {
//         console.log('commit 테이블이 정상적으로 생성되었습니다.');
//     }
// });


// 댓글 추가 엔드포인트
app.post('/articles/:id/comments', (req, res) => {
    let article_id = req.params.id;
    let content = req.body.content;

    if (!content) {
        return res.status(400).json({ error: '댓글 내용을 입력하세요.' });
    }

    let created_at = new Date().toISOString(); // 현재 시간 (ISO 형식)

    let sql = `INSERT INTO comments (content, created_at, article_id) VALUES (?, ?, ?)`;

    db.run(sql, [content, created_at, article_id], function (err) {
        if (err) {
            return res.status(500).json({ error: '댓글 저장 중 오류 발생' });
        }
        res.status(201).json({
            message: '댓글이 등록되었습니다.',
            comment_id: this.lastID
        });
    });
});

app.get('/articles/:id/comments', (req, res) => {
    let article_Id = req.params.id
    let sql = `SELECT * FROM comments WHERE article_id = ?`
    db.all(sql, [article_Id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message })
        }
        res.json(rows)
    })
})

app.post('/users', (req, res) => {
    let { email, password } = req.body;

    // 비밀번호를 bcrypt로 해싱
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // 해싱된 비밀번호를 데이터베이스에 저장
        db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                id: this.lastID,
                email,
                created_at: new Date().toISOString()
            });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요.' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        if (!user) {
            return res.status(401).json({ error: '이메일 없음.' });
        }

        // bcrypt로 비밀번호 비교
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ error: '비밀번호 비교 오류' });
            }
            if (!isMatch) {
                return res.status(401).json({ message: '비밀번호가 틀림' });
            }

            // JWT 생성 (1시간 후 만료)
            const payload = { id: user.id, email: user.email };
            const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

            // 로그인 성공 후 JWT 토큰 반환
            res.status(200).json({
                message: "로그인 성공",
                token: token
            });
        });
    });
});

app.get('/logintest', (req, res) => {
    console.log(req.headers.authorization.split(' ')[1])
    let token = req.headers.authorization.split(' ')[1]

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.send("에러")
        }

        return res.send('로그인 성공!')
    })
});


// JWT 인증 미들웨어
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1]; // Bearer 토큰 형식으로 받음

    if (!token) {
        return res.status(403).json({ message: '로그인이 필요합니다.' });
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
        }
        req.user = user; // 인증된 사용자 정보를 req.user에 추가
        next(); // 인증이 성공하면 다음 미들웨어로 진행
    });
};

// 게시글 작성 API에 인증 미들웨어 추가
app.post('/articles', authenticateJWT, (req, res) => {
    const { title, content } = req.body;

    // 로그인한 사용자만 게시글을 작성할 수 있도록 합니다.
    if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
    }

    // 인증된 사용자 정보를 이용해 작성자를 기록할 수 있습니다.
    const authorId = req.user.id; // JWT에서 인증된 사용자 ID를 가져옵니다.

    db.run(`INSERT INTO articles (title, content, author_id) VALUES (?, ?, ?)`,
        [title, content, authorId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, title, content, author_id: authorId });
        });
});
