// jwt_example.js
const jwt = require('jsonwebtoken');
const secretKey = 'mysecretkey'; // JWT 서명에 사용할 비밀키
const payload = { username: 'honggunwoo', role: 'age:18181818181818181818181818' };
// JWT 생성 (1시간 후 만료)
const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
console.log('생성된 JWT:', token);

// 토큰의 내부 내용을 확인 (헤더, 페이로드, 서명)
const decoded = jwt.decode(token, { complete: true });
console.log('디코딩한 JWT:', decoded);


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

            // 로그인 성공 후 JWT 토큰 반환
            res.status(200).json({
                message: "로그인 성공",
                token: token
            });
        });
    });
});
