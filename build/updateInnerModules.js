const path = require("path");
const semver = require("semver");
const npm = require("npm");
const fs = require("fs");

console.log("start to update akashic-modules");
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = require(packageJsonPath);
const versionsAfterUpdate = {};
// 本来akashic-pdiは不要だが、TypeScript が出力する JS に依存が(不必要に)残ってしまっているので、ないとビルド時にエラーで落ちてしまう
const modules = [
	{
		name: "akashic-engine",
		savingType: "dependencies"
	},
	{
		name: "game-driver",
		savingType: "dependencies"
	},
	{
		name: "pdi-browser",
		savingType: "devDependencies",
	},
	{
		name: "playlog-client",
		savingType: "optionalDependencies"
	},
	{
		name: "akashic-pdi",
		savingType: "dependencies"
	}
];

const promises = modules.map(function(module){
	return new Promise(function(resolve, reject) {
		npm.load({"save-dev": true, "save-exact": true}, function(err) {
			if (err) {
				reject(err);
				return;
			}
			npm.install(`@akashic/${module.name}@latest`, function(err) {
				if (err) {
					reject(err);
					return;
				}
				npm.info(`@akashic/${module.name}@latest`, "version", function(err, version) {
					if (err) {
						reject(err);
						return;
					}
					versionsAfterUpdate[module.name] = semver.valid(Object.keys(version)[0]);
					resolve();
				});
			});
		});
	}).catch(function(err) {
		console.error(err);
		process.exit(1);
	});
});

Promise.all(promises).then(function() {
	const updatedModules = modules.filter(function(module) {
		const before = packageJson[module.savingType][`@akashic/${module.name}`];
		const after = versionsAfterUpdate[module.name];
		return before !== after;
	});

	// 内部モジュールに更新がない時はエラーコードを返す
	if (updatedModules.length === 0) {
		console.error("there are no modules to be updated");
		process.exit(1);
	}
	updatedModules.forEach(function(module){
		packageJson[module.savingType][`@akashic/${module.name}`] = versionsAfterUpdate[module.name];
		console.log(`update @akashic/${module.name} to ${versionsAfterUpdate[module.name]}`);
	});
	packageJson["version"] = semver.inc(semver.valid(packageJson["version"]), 'patch');
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
	console.log(`update version to ${packageJson["version"]}. complete to update akashic-modules`);
}).catch(function(err) {
	console.error(err);
	process.exit(1);
});
