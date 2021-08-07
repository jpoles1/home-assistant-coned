// Import config from .env

// eslint-disable-next-line
require("dotenv").config();

import { ConEd } from "./coned";

import { connect } from "trilogy";
import chalk from "chalk";
import fs from "fs";
import fastify from "fastify";

const output_dir = "out";

if (!fs.existsSync(output_dir)) {
	fs.mkdirSync(output_dir);
}

async function main() {
	const db = connect(`./${output_dir}/storage.db`);

	process.on("exit", function () {
		db.close();
		console.log(chalk.green("Successfully closed DB connection!"));
	});

	const powerSchema = {
		id: "increments",
		startTime: { type: Date, unique: true },
		endTime: { type: Date, unique: true },
		power: { type: Number },
	};
	const powerModel = await db.model("power", powerSchema);

	async function db_store(raw_data: any) {
		const filtered_data = raw_data.reads.filter((row: any) => {
			return row.value !== null && row.value !== undefined;
		});
		for (const row of filtered_data) {
			await powerModel.updateOrCreate({ startTime: new Date(row.startTime), endTime: new Date(row.endTime) }, { power: row.value }).catch((e) => {
				console.log(chalk.red(`Err: ${e}`));
			});
		}
		console.log(chalk.green("Database Updated!"));
		console.log(chalk.green("Database Closed!"));
	}

	const c = new ConEd({ db_store });
	c.monitor();

	const server = fastify({
		logger: true,
	});

	// Declare a route
	server.get<{
		Querystring: { h: number };
	}>("/latest", (request, reply) => {
		console.log(request.query);
		let hour_lookback = 24;
		if (request.query.h) {
			if (!!Number(request.query.h)) {
				hour_lookback = Number(request.query.h);
			} else {
				reply.code(400).type("text/plain").send("Err 400: Invalid Request");
				return;
			}
		}
		const d = new Date();
		d.setHours(d.getHours() - hour_lookback);
		powerModel.find([["startTime", ">", d]]).then((resp_data) => {
			reply.send({ data: resp_data });
		});
	});

	// Run the server!
	server.listen(3000, "0.0.0.0", function (err, address) {
		if (err) {
			server.log.error(err);
			process.exit(1);
		}
		server.log.info(`server listening on ${address}`);
	});
}

main();
