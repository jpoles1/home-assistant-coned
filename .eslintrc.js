module.exports = {
    root: true,
    env:  {
        node: true  
    }, 
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 9,
        project: "./tsconfig.json"  
    },
    extends: [
        "plugin:@typescript-eslint/recommended",
        "prettier/@typescript-eslint",
        "plugin:prettier/recommended"
      
    ],
    plugins: [
        '@typescript-eslint'
    ]

}