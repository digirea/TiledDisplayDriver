var replace = require("replace"),
	path = require("path"),
	fs = require("fs"),
	target,
	name;

if (process.argv.length > 2) {
	name = process.argv[2];
}

target = path.resolve(__dirname, "jsdoc/" + name + "/index.html");
target2 = path.resolve(__dirname, "jsdoc/" + name + "/global.html");

if (fs.existsSync(target)) {
	replace({
		regex : "Global",
		replacement : name,
		paths : [target],
		recursive : false
	});
}

if (fs.existsSync(target2)) {
	replace({
		regex : "Global",
		replacement : name,
		paths : [target2],
		recursive : false
	});
}
