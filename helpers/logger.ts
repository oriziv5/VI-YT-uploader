import * as appInsights from "applicationinsights";

// Use your app insights key to log
const KEY = "";

export class Logger {
  public static ai;
  public static client: appInsights.TelemetryClient;
  constructor() {}

  static log(msg: string) {
    if(KEY) {
      Logger.client.trackTrace({ message: msg });
    }
    console.log(msg);
  }

  static setup() {
    if(KEY) {
      Logger.ai = appInsights.setup(KEY).start();
      Logger.client = appInsights.defaultClient;
      Logger.client.commonProperties.app = "youtube-vi";
    }
  }
}
