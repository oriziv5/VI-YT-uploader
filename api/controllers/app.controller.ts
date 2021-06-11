import { Request, Response } from "express";
import { getMp4ForVideo } from "../../helpers/youtube";
import * as promise from "bluebird";
import {
  uploadVideo,
  getAccountAccessToken,
  getAccountVideos,
} from "../../helpers/api";
import * as fs from "fs";
import * as colors from "colors";
import { FormDataFile, IUploadParams, IYoutubeVideo } from "../../helpers/interfaces";
import * as formidable from "formidable";
import {
  urlRegex,
  youtubeUrlValidate,
  vimeoRegex,
  oneUrlRegex,
} from "../../helpers/regex";
import { getUrlInfo, getUrlName } from "../../helpers/url";
import { truncateName } from "../../helpers/string";
import { getVimeoUrl } from "../../helpers/vimeo";
import { apimInstances } from "../../helpers/apim";
import { Logger } from "../../helpers/logger";
import jwt_decode from "jwt-decode";
import { AxiosError } from "axios";
import { getTokenFromHeader } from "../../helpers/token";

// Promisify the readFile.
const readFile = promise.promisify(fs.readFile);

export async function UploadVideo(req: Request, res: Response) {
  try {
    const accountId = req.body.accountId || req.params.id;
    const token = getRequestAccessToken(req);
    let url = req.body.videoUrl;
    const env = req.body.env || req.query.env;
    const region = req.body.region || req.query.region;
    const contentType = req.headers["content-type"];

    // Validate that token has provided
    if (!token) {
      return res.status(401).json({ error: "Access token validation failed" });
    }
    // Validate edit token
    const decoded: any = jwt_decode(token);
    if (decoded.AllowEdit === "False") {
      return res.status(401).json({
        error:
          "You should pass token with permissions to upload video (AllowEdit=true)",
      });
    }

    // If token is expired
    if (Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        error: "You are using an expired token, please get a new one",
      });
    }

    // Validate that account id is provided.
    if (!accountId) {
      return res.status(400).json({ error: "Please provide account Id" });
    }

    // check if token is ok to account:
    Logger.log(`Checking api connection by getting videos`);
    const videos = await getAccountVideos(token, accountId, env, region);
    Logger.log(`Got ${videos.data.results.length} videos, connection is OK!`);

    // If file was provided
    if (contentType.includes("multipart/form-data")) {
      Logger.log(`File detected`);
      await handleFiles(req, res);
    } else {
      Logger.log(`Url detected`);
      // If url was provided
      if (!url) {
        return res.status(400).json({ error: "Please provide any url to upload" });
      }

      // Try upload the url
      Logger.log(`Uploading video by url provided`);
      url = encodeURIComponent(url);
      const video = await uploadVideo(
        accountId,
        token,
        env,
        region,
        req.body
      );
      Logger.log(`Uploaded with ${video.data.id}`);
      return res.json(video.data);
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    return res
      .status(axiosError.response.status)
      .json({ error: axiosError.response.data.Message });
  }
}

export async function GetUrl(req: Request, res: Response) {
  const youtubeId = req.query.v;
  const url = req.query.url;
  if (!youtubeId && !url) {
    return res
      .status(400)
      .json({ error: "Invalid input, missing file url, or file uploaded" });
  }

  if (url && !oneUrlRegex.test(url)) {
    return res.status(400).json({ error: "Invalid url" });
  }

  // Check if we got youtube id then get its link
  // If its regular url then check its valid url, otherwise reject
  try {
    if (youtubeUrlValidate.test(url)) {
      Logger.log("Youtube url detected!");
      const data = await getMp4ForVideo(url);
      return res.json(data);
    } else {
      if (vimeoRegex.test(url)) {
        Logger.log("Vimeo url detected!");
        const vimeoLink = await getVimeoUrl(url);
        if (vimeoLink.url) {
          const video: IYoutubeVideo = {
            name: vimeoLink.name,
            url: vimeoLink.url,
            thumb: vimeoLink.thumb,
          };
          return res.json(video);
        } else {
          return res.status(400).json({ error: "Invalid url" });
        }
      } else {
        Logger.log(`Detected regular url ${url}`);
        const urlInfo = await getUrlInfo(url);
        if (urlInfo.length) {
          const video: IYoutubeVideo = {
            url: decodeURIComponent(url),
            name: getUrlName(url),
          };
          return res.json(video);
        } else {
          return res.status(400).json({ error: "Invalid url" });
        }
      }
    }
  } catch (error) {
    res.status(500);
    res.json({ error: error });
  }
}

export async function GetAccessToken(req: Request, res: Response) {
  try {
    // Get the apiKey sent in query or from header
    const key =
      req.query?.apiKey || getTokenFromHeader(req.headers.authorization);
    const { env, accountId, region } = req.query;
    if (!env || !apimInstances[env]) {
      return res.status(400).json({ error: "Environment not supported!" });
    }

    // Get the token from the API
    const token = await getAccountAccessToken(key, accountId, env, region);

    // Clean the token
    const accessToken = token.data.replace(/\"/g, "");

    // Return token
    return res.json({ token: accessToken });
  } catch (error) {
    const axiosError = error as AxiosError;
    return res
      .status(axiosError.response.status)
      .json({ error: axiosError.response.data.Message });
  }
}

export async function Home(req: Request, res: Response) {
  res.sendFile("index.html");
}

export async function getListLinks(links: string[]): Promise<IYoutubeVideo[]> {
  const videos: IYoutubeVideo[] = [];
  return new Promise<IYoutubeVideo[]>((resolve, reject) => {
    promise
      .each(links, (link: string) => {
        // If its a youtube link:
        if (youtubeUrlValidate.test(link)) {
          const youtubeId = link.split("v=")[1];
          Logger.log(`Getting link for, ${youtubeId}`);
          return getMp4ForVideo(link)
            .then((video) => {
              if (video) {
                video.name = truncateName(video.name);
                video.url = video.url;
                videos.push(video);
                Logger.log(video.name);
              }
            })
            .catch((err) => {
              Logger.log(colors.red(err));
            });
        }

        if (vimeoRegex.test(link)) {
          Logger.log("Vimeo url link detected in file");
          return getVimeoUrl(link)
            .then((vimeoLink) => {
              if (vimeoLink.url) {
                const video: IYoutubeVideo = {
                  name: vimeoLink.name,
                  url: vimeoLink.url,
                  thumb: vimeoLink.thumb,
                };
                videos.push(video);
              }
            })
            .catch((err) => {
              Logger.log(colors.red(err));
            });
        }
        // If its a regular url link
        Logger.log(`Getting link for ${link}`);
        return getUrlInfo(link)
          .then((info) => {
            if (info.length) {
              videos.push({ url: link, name: getUrlName(link) });
            }
          })
          .catch((err) => {
            Logger.log(colors.red(err));
          });
      })
      .then(
        (result) => {
          resolve(videos);
        },
        (err) => {
          reject(err);
        }
      );
  });
}

export async function uploadVideoList(
  videos: IYoutubeVideo[],
  accountId: string,
  token: string,
  env: string,
  region: string,
  uploadParams: IUploadParams
): Promise<any> {
  const wait = 12 * 1000;
  const uploaded = [];
  return new Promise<IYoutubeVideo[]>(async (resolve, reject) => {
    promise
      .each(videos, (video, i) => {
        Logger.log(colors.yellow(`Waiting ${wait}ms for throttling...`));
        const waitingTime = i === 0 ? 0 : wait;
        return promise.delay(waitingTime).then(() => {
          Logger.log(colors.yellow(`Uploading ${i + 1}/${videos.length}`));

          uploadParams.name = video.name;
          uploadParams.videoUrl = video.url;

          return uploadVideo(
            accountId,
            token,
            env,
            region,
            uploadParams
          )
            .then((vid) => {
              Logger.log(colors.green(`Uploaded successfully with id ${vid.data.id}`));
              uploaded.push({
                id: vid.data.id,
                title: vid.data.name,
              });
            })
            .catch((err) => {
              Logger.log(
                colors.red(`${video.name} failed uploading with error: ${err}`)
              );
            });
        });
      })
      .then(
        (result: any) => {
          Logger.log(colors.green(`Finished uploading queue!`));
          resolve(uploaded);
        },
        (err) => {
          Logger.log(colors.red("Promise.each failed"));
          reject(err);
        }
      )
      .catch((err) => {
        Logger.log(colors.red("fail catch"));
        reject(err);
      });
  });
}

async function handleFiles(req: Request, res: Response): Promise<any> {
  try {
    const accountId = req.body.accountId || req.params.id;
    const token = getRequestAccessToken(req);
    const env = req.body.env || req.query.env;
    const region = req.body.region || req.query.region;
    let uploadOptions = req.body;

    // Get form data
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        throw err;
      }

      // If request has files
      if (!files) {
        throw "No files found";
      }
      const keys = Object.keys(files);
      const file:FormDataFile = files[keys[0]];

      if (file) {
        Logger.log(`Got file name: ${file.name} size: ${file.size} bytes`);
        readFile(file.path).then(
          async (data) => {
            // Read links
            const links = data.toString().match(urlRegex);

            // Check that it is a youtube link or regular link
            const checkedLinks = [];
            links.forEach((link) => {
              if (youtubeUrlValidate.test(link)) {
                checkedLinks.push(link);
              } else {
                checkedLinks.push(link);
              }
            });

            Logger.log(`CheckedLinks: ${checkedLinks.length}\n${checkedLinks}`);
            let uploaded = null;
            let jsonResp: any = {};

            if (checkedLinks.length) {
              getListLinks(checkedLinks).then((videos) => {
                Logger.log(uploadOptions);
                let options = req.body;
                uploadVideoList(
                  videos,
                  accountId,
                  token,
                  env,
                  region,
                  fields
                );
              });
            } else {
              res.status(400);
              jsonResp = { error: "No links was found at the file" };
            }

            // delete file
            fs.unlink(file.path, function (err) {
              if (err) throw err;
              Logger.log("successfully deleted " + file.path);
              jsonResp.message = "Job sent!";
              jsonResp.jobId = Math.round(Math.random() * 1000);
              res.json(jsonResp);
            });
          },
          (err) => {
            res.json({ error: err });
          }
        );
        return;
      } else {
        return res.status(500).json({ error: "File was not found" });
      }
    });
  } catch (error) {
    throw error;
  }
}

function getRequestAccessToken(req: Request) {
  return req.body.token || getTokenFromHeader(req.headers.authorization);
}
