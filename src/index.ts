// Import config from .env

// eslint-disable-next-line
require("dotenv").config();

import { ConEd } from "./coned";
import { connect } from "trilogy";
import chalk from "chalk";
import fs from "fs";
import moment from "moment";
import fastify from "fastify";
import mqtt from "async-mqtt";

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

	let latest_read_startTime = new Date(0);
	async function send_mqtt(latest_read: PowerEntry) {
		if (latest_read.startTime < latest_read_startTime) return;
		latest_read_startTime = latest_read.startTime;
		mqtt.connectAsync(process.env.MQTT_HOST).then(async (client) => {
			await client.publish("coned/meter_read", JSON.stringify(latest_read));
			await client.end();
			console.log(chalk.green(`Sent MQTT update: ${latest_read.power} kWh @ ${moment(latest_read.startTime).format("LLL")}`));
		});
	}

	async function db_store(raw_data: any) {
		const filtered_data = raw_data.reads.filter((row: any) => {
			return row.value !== null && row.value !== undefined;
		});
		const latest_read = filtered_data[0];
		send_mqtt(latest_read);
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
			function to_delta_string(dt: Date): string {
				const delta_min = Math.abs(dt.getTime() - new Date().getTime()) / 6e4;
				return delta_min < 60 ? `${delta_min.toFixed(0)}min` : `${(delta_min / 60).toPrecision(2)}hr`;
			}
			//Create array of power readings starting with the most recent
			const readings = Object.values(raw_data).map((row: PowerEntry) => row.power);
			//Time of earliest read in list
			const earliest_dt: Date = Object.values(raw_data)[raw_data.length - 1].startTime;
			const earliest_delta = to_delta_string(earliest_dt);
			//Time of peak (most recent if tie)
			const peak_index = readings.indexOf(Math.max.apply(null, readings));
			const peak = Object.values(raw_data)[peak_index].power;
			const peak_dt = Object.values(raw_data)[peak_index].startTime;
			const peak_delta = to_delta_string(peak_dt);
			//Time of latest read in list
			const latest_dt: Date = Object.values(raw_data)[0].startTime;
			const latest_delta = to_delta_string(latest_dt);
			const resp_data = { earliest_delta, latest_delta, peak, peak_delta, readings };
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
