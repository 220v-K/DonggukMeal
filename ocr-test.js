const Tesseract = require("tesseract.js");
const fs = require("fs"); // 파일 시스템 모듈 로드

// 이미지 파일의 경로
const imagePath = "./mealtest.jpg";

Tesseract.recognize(
  imagePath,
  "kor", // OCR 대상 언어. 필요에 따라 변경 가능
  { logger: (m) => console.log(m) } // 진행 상황 로깅
)
  .then(({ data: { text } }) => {
    console.log(text); // 콘솔에 추출된 텍스트 출력

    // 추출된 텍스트를 'output.txt' 파일로 저장
    fs.writeFile("output.txt", text, (err) => {
      if (err) {
        console.error("파일 저장 중 오류 발생:", err);
      } else {
        console.log("텍스트가 output.txt 파일에 저장되었습니다.");
      }
    });
  })
  .catch((error) => {
    console.error(error);
  });
