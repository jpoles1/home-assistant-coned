module.exports = {
	env: {
		es6: true,
		node: true,
	},
	parserOptions: {
		parser: "@typescript-eslint/parser",
		ecmaVersion: 2018,
		sourceType: "module",
	},
	plugins: ["@typescript-eslint", "prettier"],
	extends: ["plugin:@typescript-eslint/recommended", "prettier"],
	rules: {
		"prettier/prettier": [
			"warn",
			{
				useTabs: true,
				printWidth: 180,
				trailingComma: "es5",
				htmlWhitespaceSensitivity: "strict",
			},
		],
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-empty-interface": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
	},
};
