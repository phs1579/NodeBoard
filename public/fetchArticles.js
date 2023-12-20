// fetchArticles.js

// DOMContentLoaded 이벤트가 발생하면 실행되는 콜백 함수입니다.
document.addEventListener('DOMContentLoaded', function () {
    // 게시글 목록을 가져오기 위해 서버에 GET 요청을 보냅니다.
    fetch('http://localhost:3000/articles')
        // 서버 응답을 JSON으로 파싱합니다.
        .then(response => response.json())
        .then(articles => {
            // 게시글 목록을 표시할 엘리먼트를 가져옵니다.
            const articlesList = document.getElementById('articles-list');

            // 각 게시글에 대한 정보를 포함하는 리스트 아이템을 생성하여 목록에 추가합니다.
            articles.forEach(article => {
                // li 엘리먼트를 생성합니다.
                const li = document.createElement('li');

                // li 엘리먼트에 게시글 정보를 텍스트로 추가합니다.
                li.textContent = `ID: ${article.idx}, Title: ${article.title}, Writer: ${article.writer}, Content: ${article.content}`;

                // 목록에 생성된 li 엘리먼트를 추가합니다.
                articlesList.appendChild(li);
            });
        });
});
