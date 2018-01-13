const Botkit = require("botkit");

let settings = require("./data/settings.json");
const dictionary = require("./data/dictionary.json");

const gh = require("./module/github-controller")();
const sl = require("./module/slack-controller")("");
sl.setAuthData(settings.token.slack.token);
gh.setAuthData(settings.token.github);

let users = false;

var fs = require("fs");

Promise.resolve()
.then( () => {
	return sl.getUsersList();
})
.then( (data) => {
	users = data;
})
.catch( (err) => {
	console.log("userList Get Error:" + err);
});

const bot = Botkit.slackbot({
	debug: false
});

bot.spawn(settings.token.slack).startRTM();

bot.hears("(Set Repository)",["direct_message","direct_mention","mention"], (bot, message) => {
	let repository = message.text.split("\n")[1];
	let channel = message

	bot.reply(
		message,
		"Setting channel repository: " + repository
	);

	Promise.resolve()
	.then( () => {
		settings["repository"][channel] = repository;
		fs.writeFile("./data/settings.json", JSON.stringify(settings, null, '\t'))
	})
	.then( (data) => {
		bot.reply(
			message,
			"Success setting channel reposiory: " + repository
		);
		console.log(data);
	})
	.catch( (err) => {
		bot.reply(
			message,
			"Error setting channel repository: " + repository + "\n" + err
		);
		console.log(err);
	});
});

bot.hears("(Create Issue)",["direct_message","direct_mention","mention"], (bot, message) => {
	let elements = message.text.split("\n");
	let createUser = users.filter( (user) => {
		return user.id == message.user;
	}) || {name:"Unknown"};

	let title = createUser[0].name + ": " + elements[1];
	let body = elements.filter( (row, index) => {return index >= 2;}).join("\n");

	bot.reply(
		message,
		dictionary[settings.lang]["Processing"].replace(/{title}/, title)
	);

	Promise.resolve()
	.then( () => {
		return gh.createIssue(title, body);
	})
	.then( (data) => {
		bot.reply(
			message,
			dictionary[settings.lang]["Success"].replace(/{title}/, title).replace(/{url}/, data.body.html_url)
		);
		console.log(data);
	})
	.catch( (err) => {
		bot.reply(
			message,
			dictionary[settings.lang]["Error"].replace(/{error}/, err)
		);
		console.log(err);
	});
});
