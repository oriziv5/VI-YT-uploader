import { IUrlInfo } from "./interfaces";
import axios from "axios";
import { nameRegex } from "./regex";
import { getRandomName } from "./string";
import * as colors from "colors";

export function serializeParams(obj: any): string {
  let str = "";
  for (let key in obj) {
    if (obj[key]) {
      if (str != "") {
        str += "&";
      }
      str += key + "=" + encodeURIComponent(obj[key]);
    }
  }
  return str;
}

export async function getUrlInfo(url: string): Promise<IUrlInfo> {
  try {
    const r = await axios.head(url);
    let fileLength = 0;
    const mimeType = r.headers["content-type"];
    const contentLength = r.headers["content-length"];
    if (contentLength) {
      console.log(colors.green(`${url} is OK!`));
      fileLength = contentLength;
    }
    return {
      length: fileLength,
      mime: mimeType || "",
    };
  } catch (error) {
    return { length: 0 };
  }
}

export function getUrlName(url: string): string {
  // Take file name if it has an extension
  const nameValue = nameRegex.exec(url);
  if (nameValue && nameValue.length) {
    return nameValue[0];
  } else {
    return getRandomName();
  }
}
