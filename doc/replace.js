var replace = require("replace"),
	path = require("path"),
	fs = require("fs"),
	i,
	target,
	name;

if (process.argv.length > 2) {
	name = process.argv[2];
}

targets = [
	path.resolve(__dirname, "jsdoc/client/" + name + "/index.html"),
	path.resolve(__dirname, "jsdoc/client/" + name + "/global.html"),
	path.resolve(__dirname, "jsdoc/server/" + name + "/index.html"),
	path.resolve(__dirname, "jsdoc/server/" + name + "/global.html")
];

for (i = 0; i < targets.length; i = i + 1) {
	target = targets[i];
	if (fs.existsSync(target)) {
		replace({
			regex : "Global",
			replacement : name,
			paths : [target],
			recursive : false
		});
	}
}
