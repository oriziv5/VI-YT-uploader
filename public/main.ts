import "./main.css";
import { SupportedLanguages } from "./languages";
import { tokenValidate, urlRegex } from "../helpers/regex";

$("document").ready(event => {
  const form = $("form");
  const submitButton = $("#sub");
  const fileInput = $('input[type="file"]');
  const fileInputInfo = $('#uploadBatchFileInfo');
  const accoundIdInput = $('input[name="accountId"]');
  const apiKeyIdInput = $('input[name="apiKey"]');
  const urlInput = $('input[name="url"]');
  const errorMessage = $("#errorMessage");
  const successMessage = $("#successMessage");
  const infoMessage = $("#infoMessage");
  const spinner = $("#spinner");
  const progress = $(".progress");
  const languageSelect = $("#langSel");
  let accountId = "";
  let key = "";

  // Init languages
  SupportedLanguages.forEach(lang => {
    if (lang.sourceLanguage) {
      languageSelect.append(
        `<option ${lang.key === "auto" ? "selected" : ""} value="${lang.key}" >${lang.name}</option>`
      );
    }
  });

  // Activate dropdown
  $(".dropdown")["dropdown"]();
  setTimeout(()=> {
    $("select")["dropdown"]();
  })
  $(".ui.accordion")["accordion"]();
  $('label[for="pass"]')["popup"]({
    on: "click"
  });
  $('label[for="file"]')["popup"]({
    on: "hover"
  });
  $('label[for="videoUrl"]')["popup"]({
    on: "hover"
  });

  // File on change
  fileInput.on("change", async e => {
    fileInputInfo.removeClass('red').addClass('green').hide();
    const data = new FormData();
    const fi: any = fileInput[0];
    const files: any = fi.files;

    if (files && files.length) {
      const fileText = await readFile(files[0]);
      const match = fileText.match(urlRegex);
      if(!match) {
        fileInputInfo.removeClass('green').addClass('red').text('File is not containing any links!').show();
      } else {
        fileInputInfo.text(`Found ${match.length} valid links`).show();
      }
      urlInput.attr("disabled", "true");
      $.each(files, (i, file) => {
        data.append(`file-${i.toString()}`, file);
      });
    } else {
      urlInput.removeAttr("disabled");
    }
  });

  function readFile(file: File): Promise<string> {
    const fr = new FileReader();
    fr.readAsText(file, 'utf-8');
    return new Promise((resolve, reject)=> {
      fr.onload = () => {
        resolve(fr.result.toString());
      }
    });
  }

  // Reset message
  hideAll();

  // Check if has previous data
  if (window.sessionStorage) {
    accountId = window.sessionStorage.getItem("acc");
    accoundIdInput.val(accountId);
    apiKeyIdInput.val(key);
  } 

  // Post job
  form.submit(data => {
    let estimatedDutaionInSeconds = 1;
    hideAll();
    submitButton.hide();
    progress["progress"]({ percent: 0 }).show();
    const fileInputElement: any = fileInput[0];
    const file: File =
      fileInputElement.files && fileInputElement.files.length
        ? fileInputElement.files[0]
        : null;
    if (file) {
      const numOfLinks = Math.round(file.size / 45);
      estimatedDutaionInSeconds = numOfLinks * 12 + 12;
    }
    const progressInterval = setInterval(() => {
      increment(100 / estimatedDutaionInSeconds);
    }, 1000);
    submitButton.attr("disabled", "true").addClass("loading");
    spinner.addClass("show");
    const params: any = {};
    const formArray = form.serializeArray();
    formArray.forEach(p => (params[p.name] = p.value));
    console.log(params);
    // Save for later
    if (window.sessionStorage) {
      window.sessionStorage.setItem("acc", params.accountId);
    }

    // Getting token
    if (params.apiKey.length > 60) {
      // User provided access token, skip aquire from apim.
      uploadVideo(params, progressInterval, params.apiKey);
    } else {
      // Show status box
      infoMessage.text("Getting token").show();
      // Get access token by API key
      $.ajax({
        url: "/api/auth/",
        headers: {
          Authorization: `Basic ${params.apiKey}`
        },
        data: {
          accountId: params.accountId,
          env: params.env,
          region: params.region
        }
      }).then(
        token => {
          // Got token, upload the video
          infoMessage.text("Getting video url");
          uploadVideo(params, progressInterval, token.token);
        },
        (err: any) => {
          clearInterval(progressInterval);
          submitButton.removeAttr("disabled").removeClass("loading");
          hideAll();
          errorMessage.text(err.responseJSON.error).show();
        }
      );
    }
    return false;
  });

  function hideAll() {
    progress.hide();
    submitButton.show();
    successMessage.hide();
    errorMessage.hide();
    infoMessage.hide();
  }

  function increment(val: number = 1) {
    progress["progress"]("increment", val);
  }

  function uploadOneVideo(videoData, ajaxParams: JQueryAjaxSettings, progressInterval) {
    let infoDataHtmlMarkup = "";
    if(videoData.thumb) {
      infoDataHtmlMarkup+=`<img src="${videoData.thumb}" width="100" height="56" style="display:inline-block"/>`;
    }
    infoDataHtmlMarkup+=`<span class="text-thumb">Uploading video: "${videoData.name}"</span>`;
    infoMessage.html(infoDataHtmlMarkup);
    delete ajaxParams?.data['apiKey'];
    ajaxParams.data['name'] = videoData.name;
    $.ajax(ajaxParams).then(
      resp => {
        submitButton.removeAttr("disabled").removeClass("loading");
        hideAll();
        successMessage.text(`Uploaded successfully with id ${resp.id}`).show();
      },
      (err: any) => {
        clearInterval(progressInterval);
        submitButton.removeAttr("disabled").removeClass("loading");
        hideAll();
        errorMessage.text(err.responseJSON.error).show();
      }
    );
  }

  function uploadVideo(params, progressInterval, token) {
    const files: any = fileInput[0]["files"];
    console.log(params);
    params.name = params.name || urlInput.val();
    let ajaxParams: JQuery.AjaxSettings = {
      url: "/api/upload",
      method: "post",
      headers: {
        Authorization: `Bearer ${token}`
      },
      data: params
    };

    // Check if has file
    if (files && files.length) {
      infoMessage.text("Uploading videos from file...").show();
      const formData = new FormData();
      ajaxParams.url =
        "/api/upload/" +
        params.accountId +
        "?env=" +
        params.env +
        "&region=" +
        params.region;
      formData.append("file-0", files[0]);
      Object.keys(params).forEach((k)=> {
        formData.append(k, params[k]);
      })
      formData.delete('apiKey');
      ajaxParams.contentType = false;
      ajaxParams.processData = false;
      ajaxParams.cache = false;
      ajaxParams.data = formData;
      $.ajax(ajaxParams).then(
        resp => {
          submitButton.removeAttr("disabled").removeClass("loading");
          progress["progress"]("complete");
          clearInterval(progressInterval);
          hideAll();
          successMessage.text(`Job ${resp.jobId} sent!`).show();
        },
        (err: any) => {
          clearInterval(progressInterval);
          submitButton.removeAttr("disabled").removeClass("loading");
          hideAll();
          errorMessage.text(err.responseJSON.error).show();
        }
      );
    } else {
      infoMessage.text("Getting video download url").show();
      const url = encodeURIComponent(params.videoUrl);
      $.get(`/api/url/?url=${url}`).then(
        data => {
          // Got youtube details
          ajaxParams.data["videoUrl"] = data.url;
          ajaxParams.data["name"] = data.title || ajaxParams.data["name"] ;
          uploadOneVideo(data, ajaxParams, progressInterval);
        },
        (err: any) => {
          clearInterval(progressInterval);
          submitButton.removeAttr("disabled").removeClass("loading");
          hideAll();
          errorMessage.text(err.responseJSON.error).show();
        }
      );
    }
  }
});
