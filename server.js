// 필요한 모듈을 가져옵니다.
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');

// Express 애플리케이션을 생성합니다.
const app = express();

// 서버를 위한 포트를 설정합니다.
const port = 3000;

// 외부 파일에서 데이터베이스 구성을 가져옵니다.
const dbConfig = require('./config/database.js');

// 제공된 구성을 사용하여 MySQL 연결 풀을 만듭니다.
const connection = mysql.createPool(dbConfig);

// 들어오는 JSON 데이터를 처리하기 위한 JSON 파서를 설정합니다.
const jsonParser = bodyParser.json();

// 'public' 디렉토리에서 정적 파일을 제공합니다.
app.use(express.static('public'));

// 서버를 특정 포트에서 실행합니다.
app.listen(port, () => {
    console.log(`게시판 앱이 포트 ${port}에서 실행 중입니다.`);
});

app.use(cookieParser());

// 모든 라우트에 대해 CORS를 활성화하여 교차 출처 문제를 방지합니다.
app.use(cors());

// 'public' 디렉토리에서 정적 파일을 제공합니다.app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static('public', { "Content-Type": "application/javascript" }));

// 이미지 주소 연동
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 이미지를 저장할 디렉토리 및 파일명 지정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// 메인 HTML 파일을 제공하는 라우트입니다.
app.get('/', (req, res) => {
    const { user } = req.cookies;
    if (user) {
        res.sendFile(__dirname + '/public/index.html');
    } else {
        res.redirect('/login');
    }
});

// 회원가입 처리를 위한 라우트입니다.
app.post('/register', jsonParser, (req, res) => {
    const { username, password } = req.body;

    // 사용자명이 이미 사용 중인지 확인합니다.
    const checkUsernameQuery = 'SELECT * FROM users WHERE username = ?';
    connection.query(checkUsernameQuery, [username], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('사용자명 가용성 확인 중 오류:', checkErr);
            return res.status(500).json({ success: false, message: '서버 오류' });
        }

        if (checkResults.length > 0) {
            return res.status(400).json({ success: false, message: '이미 사용 중인 사용자명입니다.' });
        }

        // 비밀번호를 해시하여 데이터베이스에 저장합니다.
        bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                console.error('비밀번호 해싱 중 오류:', hashErr);
                return res.status(500).json({ success: false, message: '서버 오류' });
            }

            // 사용자 정보를 데이터베이스에 저장합니다.
            const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
            connection.query(insertUserQuery, [username, hashedPassword], (insertErr, insertResults) => {
                if (insertErr) {
                    console.error('데이터베이스에 사용자 삽입 중 오류:', insertErr);
                    return res.status(500).json({ success: false, message: '서버 오류' });
                }

                // 회원가입 성공
                res.json({ success: true, message: '회원가입이 완료되었습니다.' });
            });
        });
    });
});

// 로그인 페이지를 제공하는 라우트입니다.
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// 로그인 처리를 위한 라우트입니다.
app.post('/login', jsonParser, (req, res) => {
    const { username, password } = req.body;

    // 'users' 테이블에서 'username' 및 'password' 열이 있는 것으로 가정합니다.
    const query = 'SELECT * FROM users WHERE username = ?';

    connection.query(query, [username], (err, results) => {
        if (err) {
            console.error('데이터베이스 쿼리 중 오류:', err);
            return res.status(500).json({ success: false, message: '서버 오류' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: '사용자명이나 비밀번호가 올바르지 않습니다.' });
        }

        const user = results[0];

        // 제공된 비밀번호를 데이터베이스에 저장된 해시된 비밀번호와 비교합니다.
        bcrypt.compare(password, user.password, (bcryptErr, passwordMatch) => {
            if (bcryptErr) {
                console.error('비밀번호 비교 중 오류:', bcryptErr);
                return res.status(500).json({ success: false, message: '서버 오류' });
            }

            if (passwordMatch) {
                // 비밀번호가 일치하면 쿠키를 설정하고 성공 응답을 보냅니다.
                res.cookie('user', username).json({ success: true, message: '로그인 성공' });
                // 콘솔에 사용자 정보 기록
                console.log('로그인한 사용자:', user);
            } else {
                // 비밀번호가 일치하지 않으면 실패 응답을 보냅니다.
                res.status(401).json({ success: false, message: '사용자명이나 비밀번호가 올바르지 않습니다.' });
            }
        });
    });
});

// 사용자 세션을 확인하는 라우트를 추가합니다.
app.get('/checkSession', (req, res) => {
    // req.cookies가 정의되어 있는지 확인합니다.
    if (req.cookies && req.cookies.user) {
        // 정의되어 있으면 사용자 정보를 보냅니다.
        res.json({ username: req.cookies.user });
    } else {
        // 정의되어 있지 않거나 사용자가 없으면 null을 보냅니다.
        res.json(null);
    }
});

// 로그아웃을 처리하는 라우트를 추가합니다.
app.get('/logout', (req, res) => {
    // 사용자가 인증되었는지 확인합니다.
    if (req.cookies.user) {
        // 사용자 쿠키를 지워 로그아웃합니다.
        res.clearCookie('user').json({ success: true, message: '로그아웃 성공' });
    } else {
        // 사용자가 인증되지 않았으면 오류 응답을 보냅니다.
        res.status(401).json({ success: false, message: '인증되지 않음' });
    }
});

// 게시글 목록을 가져오는 라우트입니다. (검색 기능 추가)
app.get('/articles', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 3;
    const offset = (page - 1) * pageSize;

    // 검색어를 쿼리 매개변수에서 가져옵니다.
    const searchKeyword = req.query.search || '';

    // 검색어가 있는 경우 검색 쿼리를 실행하고, 없는 경우 모든 게시물을 가져오는 쿼리를 실행합니다.
    const query = searchKeyword
        ? 'SELECT * FROM board WHERE title LIKE ? ORDER BY idx DESC LIMIT ? OFFSET ?'
        : 'SELECT * FROM board ORDER BY idx DESC LIMIT ? OFFSET ?';

    const searchKeywordWithWildcards = `%${searchKeyword}%`;

    // 쿼리에 따라 매개변수 설정
    const queryParams = searchKeyword ? [searchKeywordWithWildcards, pageSize, offset] : [pageSize, offset];

    connection.query(query, queryParams, (searchErr, searchRows) => {
        if (searchErr) {
            console.error('게시글 목록을 가져오는 중 오류 발생:', searchErr);
            return res.status(500).send('서버 오류');
        }

        // 검색된 게시글 수를 가져오는 쿼리
        const countQuery = searchKeyword
            ? 'SELECT COUNT(*) AS totalCount FROM board WHERE title LIKE ?'
            : 'SELECT COUNT(*) AS totalCount FROM board';

        const countQueryParams = searchKeyword ? [searchKeywordWithWildcards] : [];

        connection.query(countQuery, countQueryParams, (countErr, countResult) => {
            if (countErr) {
                console.error('총 레코드 수를 가져오는 중 오류 발생:', countErr);
                return res.status(500).send('서버 오류');
            }

            const totalCount = countResult[0].totalCount;
            const totalPages = Math.ceil(totalCount / pageSize);

            // 검색된 레코드 및 최대 페이지 수를 응답으로 전송합니다.
            res.send({
                rows: searchRows,
                totalPages,
                page_current: page,
                page_max: totalPages,
                searchKeyword,
            });
        });
    });
});

// 새로운 게시글을 작성하는 라우트입니다. (이미지 업로드 기능 추가)
app.post('/article', upload.single('image'), jsonParser, (req, res) => {
    // 'board' 테이블에 새 레코드를 삽입하기 위한 SQL 쿼리입니다.
    const sql = 'INSERT INTO board (title, user_id, content, image_url) VALUES (?,?,?,?)';
    const title = req.body.title;
    const user_id = req.body.user_id;
    const content = req.body.content;

   // 변경된 부분: 이미지 파일이 업로드된 경우, 이미지 URL을 요청 데이터에 추가합니다.
   const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // 변경된 부분: params 변수를 정의하여 데이터를 담습니다.
    const params = [title, user_id, content, imageUrl];

    // 주어진 매개변수로 쿼리를 실행합니다.
    connection.query(sql, params, (err, rows, fields) => {
        if (err) {
            console.error('새 글 삽입 중 오류 발생:', err);
            return res.status(500).json({ status: 500, message: '내부 서버 오류' });
        }

        console.log(rows);

        // 쿼리 결과를 응답으로 전송합니다 (클라이언트에게 무언가를 전송하려고 가정합니다).
        res.status(201).json({ status: 201, message: '게시글이 성공적으로 작성되었습니다.', data: rows });
    });
});



// 기존 게시글을 ID를 기반으로 가져오는 라우트입니다.
app.get('/articles/:id', (req, res) => {
    const articleId = req.params.id;
    console.log(`ID가 ${articleId}인 게시글을 가져오는 중`);

    // 디버깅 정보와 함께 데이터베이스에 쿼리합니다.
    connection.query('SELECT * FROM board WHERE idx = ?', [articleId], (err, rows) => {
        if (err) {
            console.error('게시글을 가져오는 중 오류 발생:', err);
            // 더 자세한 오류 응답을 반환합니다.
            return res.status(500).json({ error: '내부 서버 오류', details: err.message });
        }

        if (!rows.length) {
            console.log(`ID가 ${articleId}인 게시글을 찾을 수 없음`);
            return res.status(404).json({ error: '게시글을 찾을 수 없음' });
        }

        const article = rows[0];

        // Increase the view count in the database
        connection.query('UPDATE board SET view_cnt = view_cnt + 1 WHERE idx = ?', [articleId], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('조회수를 증가하는 중 오류 발생:', updateErr);
                // 오류 응답을 반환합니다.
                return res.status(500).json({ error: '내부 서버 오류', details: updateErr.message });
            }

            console.log(`ID가 ${articleId}인 게시글의 조회수를 증가함`);
            res.json(article);
        });
    });
});


// ID를 기반으로 게시글을 삭제하는 라우트입니다.
app.delete('/article/:id', (req, res, next) => {
    // 'board' 테이블에서 모든 레코드를 선택하기 위한 데이터베이스 쿼리를 실행합니다.
    connection.query('SELECT * FROM board', (err, rows, fields) => {
        if (err) throw err;
        // 주어진 ID를 기반으로 검색된 레코드에서 게시글을 찾습니다.
        const article = rows.find(art => art.idx === parseInt(req.params.id));
        if (!article) {
            // 게시글을 찾지 못하면 404 상태와 메시지를 전송합니다.
            return res.status(404).send('ID를 찾을 수 없습니다.');
        }
        // 'board' 테이블에서 게시글을 삭제하는 SQL 쿼리입니다.
        connection.query('DELETE FROM board WHERE idx = ?', [req.params.id], (err, rows, fields) => {
            if (err) throw err;
            // JSON 응답을 통해 삭제를 나타냅니다.
            res.json('삭제됨: ' + req.params.id);
        });
    });
});

// 게시글 수정
app.put('/article/:id', upload.single('image'), jsonParser, (req, res) => {
    // 요청에서 필요한 정보 추출
    const articleId = req.params.id;
    const { title, content } = req.body;

    // 주어진 ID로 기존의 글이 존재하는지 확인
    connection.query('SELECT * FROM board WHERE idx = ?', [articleId], (err, rows) => {
        if (err) {
            console.error('글 존재 여부 확인 중 오류 발생:', err);
            return res.status(500).json({ status: 500, message: '내부 서버 오류' });
        }

        // 글이 존재하지 않으면 404 에러 반환
        if (rows.length === 0) {
            return res.status(404).json({ status: 404, message: '글을 찾을 수 없습니다.' });
        }

        // 변경된 부분: 이미지 파일이 업로드된 경우, 이미지 URL을 요청 데이터에 추가합니다.
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // 새로운 데이터로 글 업데이트
        let updateQuery = 'UPDATE board SET title = ?, content = ?, update_time = CURRENT_TIMESTAMP';
        
        // 이미지 URL이 있는 경우에만 추가
        if (imageUrl) {
            updateQuery += ', image_url = ?';
        }

        updateQuery += ' WHERE idx = ?';

        const updateParams = [title, content];

        // 이미지 URL이 있는 경우에만 매개변수에 추가
        if (imageUrl) {
            updateParams.push(imageUrl);
        }

        updateParams.push(articleId);

        connection.query(updateQuery, updateParams, (err, rows) => {
            if (err) {
                console.error('글 업데이트 중 오류 발생:', err);
                return res.status(500).json({ status: 500, message: '내부 서버 오류' });
            }

            // 업데이트가 성공하면 성공 메시지와 데이터 반환
            res.json({ status: 200, message: '수정이 완료되었습니다.', data: { title, content, imageUrl } });
        });
    });
});


// 댓글
app.post('/comment', jsonParser, (req, res) => {
    const { article_id, user_id, comment_text } = req.body;
    const insertCommentQuery = 'INSERT INTO comments (article_id, user_id, comment_text) VALUES (?, ?, ?)';
    connection.query(insertCommentQuery, [article_id, user_id, comment_text], (err, result) => {
        if (err) {
            console.error('댓글 추가 중 오류 발생:', err);
            return res.status(500).json({ success: false, message: '서버 오류' });
        }
        res.status(201).json({ success: true, message: '댓글이 성공적으로 작성되었습니다.', data: result });
    });
});

// 댓글 가져오기
app.get('/comments/:article_id', (req, res) => {
    const articleId = req.params.article_id;
    const getCommentsQuery = 'SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC';
    connection.query(getCommentsQuery, [articleId], (err, comments) => {
        if (err) {
            console.error('댓글 가져오기 중 오류 발생:', err);
            return res.status(500).json({ success: false, message: '서버 오류' });
        }
        res.json(comments);
    });
});
// 댓글 삭제
app.delete('/comment/:id', (req, res) => {
    const commentId = req.params.id;

    // 'comments' 테이블에서 주어진 ID의 댓글을 삭제하는 SQL 쿼리입니다.
    const deleteCommentQuery = 'DELETE FROM comments WHERE comment_id = ?';

    // 주어진 ID로 댓글을 찾고 삭제합니다.
    connection.query(deleteCommentQuery, [commentId], (err, result) => {
        if (err) {
            console.error('댓글 삭제 중 오류 발생:', err);
            return res.status(500).json({ success: false, message: '서버 오류' });
        }

        // 삭제 성공 시 응답을 반환합니다.
        res.json({ success: true, message: '댓글이 성공적으로 삭제되었습니다.', data: result });
    });
});



