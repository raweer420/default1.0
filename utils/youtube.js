const { google } = require("googleapis");
const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

function parseISO8601Duration(duration) {
  const match = duration.match(/PT(\d+M)?(\d+S)?/);
  const minutes = match[1] ? parseInt(match[1].replace("M", "")) : 0;
  const seconds = match[2] ? parseInt(match[2].replace("S", "")) : 0;
  return minutes * 60 + seconds;
}

async function getVideoDuration(videoId) {
  const res = await youtube.videos.list({
    part: "contentDetails",
    id: videoId,
  });
  if (!res.data.items.length) return null;
  const durationISO = res.data.items[0].contentDetails.duration;
  return parseISO8601Duration(durationISO);
}

async function findValidYouTubeLink(query) {
  const res = await youtube.search.list({
    part: "snippet",
    q: query,
    maxResults: 5,
    type: "video",
    videoDuration: "medium",
  });

  for (const item of res.data.items) {
    const videoId = item.id.videoId;
    const duration = await getVideoDuration(videoId);
    if (duration && duration > 30) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }
  return null;
}

module.exports = {
  findValidYouTubeLink,
};