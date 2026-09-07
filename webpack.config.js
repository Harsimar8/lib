'use strict';
module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'pubsub-lib.js', // <-- Important
        libraryTarget: 'umd', // <-- Important
        library: 'pubsub',
        globalObject: 'window'
    },
    target: 'web', // <- Important
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader'
            }
        ]
    },
    mode: 'development',
    devtool: 'source-map',
    resolve: {
        extensions: [ '.ts', '.tsx', '.js' ]
    }
};