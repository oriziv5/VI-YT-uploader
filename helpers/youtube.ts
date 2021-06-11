import * as ytdl from "ytdl-core";
import { IYoutubeVideo } from "./interfaces";

export async function getMp4ForVideo(
  youtubeUrl: string
): Promise<IYoutubeVideo> {
  try {
    const info = await ytdl.getInfo(youtubeUrl);
    let chosenFormat = ytdl.chooseFormat(info.formats, {
      quality: "highest",
      filter: "video",
    });
    if (chosenFormat) {
      const thumb = info.videoDetails?.thumbnails?.[0].url;
      return {
        url: chosenFormat["url"],
        name: info.videoDetails.title,
        thumb: thumb || '',
      };
    } else {
      throw "Cant get YouTube download url. Check that the video is not protected or licensed";
    }
  } catch (err) {
    throw "Cant get YouTube download url. Check that the video is not protected or licensed";
  }
}
