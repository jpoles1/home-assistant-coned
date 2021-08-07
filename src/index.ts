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
	type PowerEntry = {
		id: number;
		startTime: Date;
		endTime: Date;
		power: number;
	};
	const powerModel = await db.model<PowerEntry>("power", powerSchema);

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
	}>("/", (request, reply) => {
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
		powerModel.find([["startTime", ">", d]]).then((raw_data) => {
			reply.send({ data: raw_data });
		});
	});

	server.get<{
		Querystring: { n: number };
	}>("/latest", (request, reply) => {
		console.log(request.query);
		let n_results = 64;
		if (request.query.n) {
			if (!!Number(request.query.n)) {
				n_results = Number(request.query.n);
			} else {
				reply.code(400).type("text/plain").send("Err 400: Invalid Request");
				return;
			}
		}
		powerModel.find({}, { limit: n_results, order: ["startTime", "desc"] }).then((raw_data) => {
			const readings = Object.values(raw_data).map((row: PowerEntry) => row.power);
			const latest: Date = Object.values(raw_data)[0].startTime;
			const last_update_min = Math.abs(latest.getTime() - new Date().getTime()) / 6e4;
			const latest_dt = `${latest.toLocaleDateString()} @ ${latest.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
			const latest_delta = last_update_min < 60 ? `${last_update_min.toFixed(0)} min ago` : `${(last_update_min / 60).toFixed(1)} hr ago`;
			const resp_data = { latest_dt, latest_delta, readings };
			reply.send(resp_data);
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
