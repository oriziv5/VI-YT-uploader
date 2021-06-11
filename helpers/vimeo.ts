import { IYoutubeVideo } from "./interfaces";
import axios from "axios";
import formurlencoded from "form-urlencoded";
import * as cheerio from "cheerio";
import { getRandomAgent } from "./userAgents";
import { getUrlName } from "./url";

export async function getVimeoUrl(url: string): Promise<IYoutubeVideo> {
  return new Promise((resolve, reject) => {
    let vimeoId;
    const body = { url: url };
    let urlBreak = url.split("/");
    vimeoId = urlBreak[urlBreak.length - 1];
    console.log(formurlencoded(body));
    console.log();
    const options = {
      method: "POST",
      body: formurlencoded(body),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": getRandomAgent()
      }
    };

    axios.get("https://www.keepdownloading.com/download.php", options).then(
      resp => {
        // console.log(resp);
        let linkUrl = "";
        const $: CheerioStatic = cheerio.load(resp.data, { decodeEntities: false });
        const links: any = $(".down-link a");
        if (links.length) {
          Array.from(links).forEach(link => {
            linkUrl = $(link).attr("href");
            console.log(linkUrl);
          });
        }
        resolve({
          url: linkUrl,
          name: getUrlName(linkUrl),
          thumb: `https://i.vimeocdn.com/video/${vimeoId}.jpg?mw=200&q=85`
        });
      },
      err => {
        console.log("Error!", err);
        reject(err);
      }
    );
  });
}
