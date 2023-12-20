// 필요한 모듈을 가져옵니다.
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

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

// 서버를 특정 포트에서 실행합니다.
app.listen(port, () => {
    console.log(`게시판 앱이 포트 ${port}에서 실행 중입니다.`);
});


// 모든 라우트에 대해 CORS를 활성화하여 교차 출처 문제를 방지합니다.
app.use(cors());

// 'public' 디렉토리에서 정적 파일을 제공합니다.
app.use(express.static('public', { "Content-Type": "application/javascript" }));

// 메인 HTML 파일을 제공하는 라우트입니다.
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


// 게시판에서 게시판 목록을 가져오는 라우트입니다.
app.get('/articles', (req, res) => {
    // 'board' 테이블에서 모든 레코드를 선택하기 위한 데이터베이스 쿼리를 실행합니다.
    connection.query('SELECT * FROM board order by idx desc', (err, rows) => {
        if (err) throw err;
        console.log(rows);
        // 검색된 레코드를 응답으로 전송합니다.
        res.send(rows);
    });
});

// 특정 ID에 대한 게시글 세부 정보를 가져오는 라우트입니다.
app.get('/articles/:id', (req, res, next) => {
    const articleId = parseInt(req.params.id);

    // 게시글 조회 시 view_cnt 증가를 위한 UPDATE 쿼리
    const updateViewCountQuery = `UPDATE board SET view_cnt = view_cnt + 1 WHERE idx = ?`;
    connection.query(updateViewCountQuery, [articleId], (updateErr, updateResult) => {
        if (updateErr) {
            console.error('게시글 조회 시 view_cnt 증가 중 오류 발생:', updateErr);
            // 오류가 발생하면 계속 진행하지 않고 오류 응답을 전송합니다.
            return res.status(500).send('서버 오류');
        }

        // 'board' 테이블에서 모든 레코드를 선택하기 위한 데이터베이스 쿼리를 실행합니다.
        const selectQuery = `SELECT * FROM board WHERE idx = ?`;
        connection.query(selectQuery, [articleId], (err, rows) => {
            if (err) {
                console.error('게시글 조회 중 오류 발생:', err);
                // 오류가 발생하면 계속 진행하지 않고 오류 응답을 전송합니다.
                return res.status(500).send('서버 오류');
            }

            // 주어진 ID를 기반으로 검색된 레코드에서 게시글을 찾습니다.
            const article = rows[0];
            if (!article) {
                // 게시글을 찾지 못하면 404 상태와 메시지를 전송합니다.
                return res.status(404).send('ID를 찾을 수 없습니다.');
            }

            // 찾은 게시글을 응답으로 전송합니다.
            res.send(article);
        });
    });
});


// 새로운 게시글을 작성하는 라우트입니다.
app.post('/article', jsonParser, (req, res) => {
    // 'board' 테이블에 새 레코드를 삽입하기 위한 SQL 쿼리입니다.
    const sql = 'INSERT INTO board (title, writer, content) VALUES (?,?,?)';
    const title = req.body.title;
    const writer = req.body.writer;
    const content = req.body.content;
    const params = [title, writer, content];
    // 주어진 매개변수로 쿼리를 실행합니다.
    connection.query(sql, params, (err, rows, fields) => {
        if (err) throw err;
        console.log(rows);
        // 쿼리 결과를 응답으로 전송합니다 (클라이언트에게 무언가를 전송하려고 가정합니다).
        res.send(rows);
    });
});

// 기존 게시글을 ID를 기반으로 업데이트하는 라우트입니다.
app.put('/article/:id', jsonParser, (req, res, next) => {
    // 현재 날짜 및 시간을 얻습니다.
    const currentTime = new Date().toISOString().slice(0, 19).replace("T", " ");

    // 주어진 ID를 기반으로 'board' 테이블에서 해당 게시글을 찾는 데이터베이스 쿼리를 실행합니다.
    connection.query('SELECT * FROM board WHERE idx = ?', [req.params.id], (err, rows, fields) => {
        if (err) throw err;

        // 주어진 ID를 기반으로 검색된 레코드에서 게시글을 찾습니다.
        const article = rows[0];

        if (!article) {
            // 게시글을 찾지 못하면 404 상태와 메시지를 전송합니다.
            return res.status(404).send('ID를 찾을 수 없습니다.');
        }

        // 'board' 테이블에서 게시글을 업데이트하는 SQL 쿼리입니다.
        const sql = 'UPDATE board SET title = ?, writer = ?, content = ?, update_time = ? WHERE idx = ?';
        const title = req.body.title;
        const writer = req.body.writer;
        const content = req.body.content;

        // 주어진 매개변수로 쿼리를 실행합니다.
        connection.query(sql, [title, writer, content, currentTime, req.params.id], (err, rows, fields) => {
            if (err) throw err;

            // 쿼리 결과를 응답으로 전송합니다 (클라이언트에게 무언가를 전송하려고 가정합니다).
            res.send(rows);
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