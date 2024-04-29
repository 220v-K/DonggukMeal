const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

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

// 이미지 다운로드
async function downloadImage(url, filename) {
  const response = await axios({
    method: "get",
    url: url,
    responseType: "stream",
  });

  const writer = fs.createWriteStream(path.resolve(__dirname, filename));

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// 이미지 링크 추출 및 다운로드
async function fetchAndDownloadImages() {
  const articleUrl = await fetchLatestPostLink();
  if (articleUrl) {
    try {
      const response = await axios.get(articleUrl);
      const $ = cheerio.load(response.data);
      const images = $("img[src*='/cmmn/fileView?']");

      for (let i = 0; i < images.length; i++) {
        const src = $(images[i]).attr("src");
        const imageUrl = src.startsWith("http")
          ? src
          : `https://dorm.dongguk.edu${src}`;
        const imageFilename = path.basename(new URL(imageUrl).pathname);
        await downloadImage(imageUrl, imageFilename);
        console.log(`Downloaded ${imageFilename}`);
      }
    } catch (error) {
      console.error("Failed to extract images from the article:", error);
    }
  } else {
    console.log("No article URL found.");
  }
}

// 실행
fetchAndDownloadImages();
