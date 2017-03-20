module.exports = {
    "extends": "google",
    "env": {
        "browser": true,
        "jquery": true,
        "es6": true
    },
    "installedESLint": true,
    "rules": {
        "linebreak-style": ["error", "windows"],
        "valid-jsdoc": 0,
        "no-unused-vars": [1, { "vars": "all", "args": "after-used" }],
        "new-cap": 1,
        "object-curly-spacing": 0
    }
};