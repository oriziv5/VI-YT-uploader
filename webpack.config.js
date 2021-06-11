// @ts-check

const HtmlWebpackInlineSourcePlugin = require("html-webpack-inline-source-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

/** @type {() => import('./node_modules/webpack/declarations/WebpackOptions').WebpackOptions} */
module.exports = (env, argv) => ({
  mode: argv.mode === "production" ? "production" : "development",

  // This is necessary because Figma's 'eval' works differently than normal eval
  devtool: argv.mode === "production" ? false : "inline-source-map",

  entry: {
    main: "./public/main.ts" // The entry point for your UI code
  },
  
  module: {
    rules: [
      // Converts TypeScript code to JavaScript
      { test: /\.ts$/, use: "ts-loader", exclude: /node_modules/ },

      // Enables including CSS by doing "import './file.css'" in your TypeScript code
      {
        test: /\.(css)$/,
        loader: [
          { loader: "style-loader" },
          {
            loader: "css-loader"
          }
        ]
      },

      // Allows you to use "<%= require('./file.svg') %>" in your HTML code to get a data URI
      { test: /\.(png|jpg|gif|webp|svg)$/, loader: [{ loader: "url-loader" }] }
    ]
  },

  // Webpack tries these extensions for you if you omit the extension like "import './file'"
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".scss"],
    modules: ["node_modules"]
  },

  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "public/dist") // Compile into a folder called "dist"
  },

  optimization: {
    minimizer: undefined,
    minimize: true
  }

  // Tells Webpack to generate "ui.html" and to inline "ui.ts" into it
  // plugins: [
  //   // @ts-ignore
  //   new HtmlWebpackPlugin({
  //     template: "./public/index.html",
  //     filename: "ui.html",
  //     inlineSource: ".(js)$",
  //     chunks: ["ui"]
  //   }),
  //   new HtmlWebpackInlineSourcePlugin()
  // ]
});
