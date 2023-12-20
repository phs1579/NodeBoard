// DOMContentLoaded 이벤트가 발생하면 실행되는 콜백 함수입니다.
document.addEventListener('DOMContentLoaded', function () {
    // 'update-form' 아이디를 가진 폼 엘리먼트를 가져옵니다.
    const updateForm = document.getElementById('update-form');

    // 폼에 submit 이벤트 리스너를 추가합니다.
    updateForm.addEventListener('submit', function (event) {
        // 기본 폼 제출 동작을 막습니다.
        event.preventDefault();

        // FormData를 사용하여 폼 데이터를 가져옵니다.
        const formData = new FormData(this);

        // 업데이트할 게시글의 ID를 폼 데이터에서 가져옵니다.
        const articleId = formData.get('id');

        // 서버에 PUT 요청을 보내어 게시글을 업데이트합니다.
        fetch(`http://localhost:3000/article/${articleId}`, {
            method: 'PUT', // HTTP 메서드는 PUT입니다.
            headers: {
                'Content-Type': 'application/json', // 요청 본문의 형식은 JSON입니다.
            },
            // FormData를 JSON 형식으로 변환하여 요청 본문에 추가합니다.
            body: JSON.stringify(Object.fromEntries(formData)),
        })
        // 서버 응답을 JSON 형식으로 파싱합니다.
        .then(response => response.json())
        .then(article => {
            // 서버에서 반환한 업데이트된  정보를 콘솔에 출력합니다.
            console.log('게시글이 업데이트되었습니다:', article);
            alert("게시글이 업데이트 되었습니다.");

            // 게시글 업데이트된 후에 index.html로 리디렉션합니다.
            window.location.href = 'http://localhost:3000/';
        })
        .catch(error => {
            // 오류가 발생하면 콘솔에 오류 메시지를 출력합니다.
            console.error('게시글 업데이트 중 오류 발생:', error);
        });
    });
});
