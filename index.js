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

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});





app.post('/articles', (req, res) => {
    const { title, content } = req.body;

    db.run(`INSERT INTO articles (title, content) VALUES (?, ?)`,
        [title, content],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, title, content });
        });
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
db.run(`CREATE TABLE IF NOT EXISTS commit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    article_id INTEGER NOT NULL,
    FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
)`, (err) => {
    if (err) {
        console.error('commit 테이블 생성 중 오류 발생:', err.message);
    } else {
        console.log('commit 테이블이 정상적으로 생성되었습니다.');
    }
});


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