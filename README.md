SQL TABLES

CREATE TABLE comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT,
    user_id INT,
    comment_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES board(idx),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE board (
    idx INT NOT NULL AUTO_INCREMENT COMMENT '번호 (PK)',
    title VARCHAR(100) NOT NULL COMMENT '제목',
    content VARCHAR(3000) NOT NULL COMMENT '내용',
    user_id VARCHAR(20) NOT NULL COMMENT '작성자',
    view_cnt INT NOT NULL DEFAULT 0 COMMENT '조회 수',
    image_url VARCHAR(255) COMMENT '이미지주소',
    insert_time DATETIME NOT NULL DEFAULT NOW() COMMENT '등록일',
    update_time DATETIME NULL COMMENT '수정일',
    PRIMARY KEY (idx)
)  COMMENT '게시판';

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);
