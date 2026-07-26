const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: "production",
    entry: {
        background: "./src/background.ts",
        chessmint: "./src/coolmint.ts",
        interfaces: "./src/interfaces.ts",
        loader: "./src/loader.ts",
        options: "./src/options.ts",
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "js/[name].js",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "public", to: "." },
            ],
        }),
    ],
};