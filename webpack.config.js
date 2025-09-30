const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new webpack.DefinePlugin({
      'process.env.INFERENCE_SERVER_URL': JSON.stringify(process.env.INFERENCE_SERVER_URL || 'https://api.openai.com/v1'),
      'process.env.MODEL_NAME': JSON.stringify(process.env.MODEL_NAME || 'gpt-3.5-turbo-1106'),
      'process.env.LLM_API_KEY': JSON.stringify(process.env.LLM_API_KEY || ''),
      'process.env.PROXY_BASE_URL': JSON.stringify(process.env.PROXY_BASE_URL || ''),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 3000,
  },
};
