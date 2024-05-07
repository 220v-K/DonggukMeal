/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const bucket = storage.bucket("donggukmeal.appspot.com");

admin.initializeApp();

//====

// 최신 게시글 링크 가져오기
async function fetchLatestPostLink() {
  const listPageUrl = "https://dorm.dongguk.edu/article/food/list";

  try {
    // 목록 페이지 요청
    const response = await axios.get(listPageUrl);
    const html = response.data;

    // 정규식을 이용하여 최신 게시글 링크 추출
    const linkRegex = /href="(\/article\/food\/detail\/\d+\?pageIndex=1&)"/;
    const match = linkRegex.exec(html);

    if (match) {
      // 완전한 URL 구성
      const fullLink = "https://dorm.dongguk.edu" + match[1];
      console.log("Latest article link:", fullLink);
      return fullLink;
    } else {
      console.log("No link found");
      return null;
    }
  } catch (error) {
    // console.error("Failed to fetch the list page:", error);
    console.log("Failed to fetch the list page:", error);
    return null;
  }
}

// 이미지 다운로드 및 Firebase Storage에 업로드
async function uploadImageToStorage(url, filename) {
  const response = await axios({
    method: "get",
    url: url,
    responseType: "stream",
  });

  const blob = bucket.file(filename);
  const blobStream = blob.createWriteStream({
    resumable: false,
  });

  response.data.pipe(blobStream);

  return new Promise((resolve, reject) => {
    blobStream.on("finish", async () => {
      // 파일을 public으로 설정하여 접근 가능하게 만듭니다.
      await blob.makePublic();
      resolve(`https://storage.googleapis.com/${bucket.name}/${filename}`);
    });
    blobStream.on("error", reject);
  });
}

// 이미지 링크 추출 및 Firebase Storage에 업로드
async function fetchAndUploadImages() {
  const articleUrl = await fetchLatestPostLink();
  if (articleUrl) {
    try {
      const response = await axios.get(articleUrl);
      const $ = cheerio.load(response.data);

      // 제목 추출 로직 가정
      const titleText = $(".tit p").text(); // 예를 들어 제목이 <h1> 태그에 있다고 가정
      const dateRegex = /(\d{2}\.\d{2}\.\d{2}~\d{2}\.\d{2})/;
      const match = dateRegex.exec(titleText);
      let formattedDate = "newImage";
      if (match) {
        formattedDate = match[1].replace(/\./g, "_").replace(/~/g, "_"); // "24_05_06_05_10" 형식으로 변경
      }

      const images = $("img[src*='/cmmn/fileView?']");

      for (let i = 0; i < images.length; i++) {
        const src = $(images[i]).attr("src");
        const imageUrl = src.startsWith("http")
          ? src
          : `https://dorm.dongguk.edu${src}`;
        // const imageFilename = path.basename(new URL(imageUrl).pathname);
        const imageFilename = `${formattedDate}.png`;
        const publicUrl = await uploadImageToStorage(imageUrl, imageFilename);
        console.log(`Uploaded ${imageFilename} to ${publicUrl}`);
      }
    } catch (error) {
      console.error("Failed to extract images from the article:", error);
    }
  } else {
    console.log("No article URL found.");
  }
}

// export
exports.fetchAndUploadImages = functions.https.onRequest(
  async (request, response) => {
    try {
      await fetchAndUploadImages();
      response.status(200).send({ status: "success", msg: "successed" });
    } catch (error) {
      response.status(500).send({ status: "fail", msg: "failed" });
    }
  }
);
