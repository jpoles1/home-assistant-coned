// Import config from .env

// eslint-disable-next-line
require("dotenv").config();

import { ConEd } from "./coned";
import { connect } from "trilogy";
import chalk from "chalk";
import fs from "fs";
import moment from "moment";
import fastify from "fastify";
import axios from "axios";

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

	const energySchema = {
		id: "increments",
		startTime: { type: Date, unique: true },
		endTime: { type: Date, unique: true },
		energy: { type: Number },
	};
	type EnergyEntry = {
		id?: number;
		startTime: Date;
		endTime: Date;
		energy: number;
	};
	const energyModel = await db.model<EnergyEntry>("energy", energySchema);

	async function update_sensor(latest: EnergyEntry) {
		// Find Date() for start of day of latest reading
		const start_of_day = moment(latest.startTime).startOf("day");
		// Get all data from current day (Date > start of day)
		energyModel.find([["startTime", ">", start_of_day.toDate()]]).then((day_data) => {
			// Add up energy usage
			const today_energy_use = day_data.reduce((agg, row) => {
				return agg + row.energy;
			}, 0);
			// Send via home assistant core API
			axios.post(
				"http://supervisor/core/api/states/sensor.coned_energy",
				{
					state: today_energy_use,
					attributes: {
						unit_of_measurement: "kWh",
						friendly_name: "ConEd Energy Usage",
						device_class: "energy",
						state_class: "measurement",
						last_reset: start_of_day.toISOString(),
					},
				},
				{
					headers: { Authorization: `Bearer ${process.env.SUPERVISOR_TOKEN}`, "Content-Type": "application/json" },
				}
			);
			console.log(chalk.green(`Sent sensor update: ${today_energy_use} kWh since ${start_of_day.format("LLL")} @ ${moment(Date.now()).format("LLL")}`));
		});
	}

	async function db_store(raw_data: any) {
		const filtered_data = raw_data.reads
			.filter((row: any) => {
				return row.value !== null && row.value !== undefined;
			})
			.map((row: any): EnergyEntry => {
				return { startTime: new Date(row.startTime), endTime: new Date(row.endTime), energy: row.value };
			}) as EnergyEntry[];
		for (const row of filtered_data) {
			await energyModel.updateOrCreate({ startTime: row.startTime, endTime: row.endTime }, { energy: row.energy }).catch((e) => {
				console.log(chalk.red(`Err: ${e}`));
			});
		}
		console.log(chalk.green("Database Updated!"));
		console.log(chalk.green("Database Closed!"));
		const latest = filtered_data[0];
		update_sensor(latest);
	}

	const c = new ConEd({ db_store });
	c.monitor();

	const server = fastify({
		//logger: true,
	});

	// Declare a route
	server.get<{
		Querystring: { h: number };
	}>("/", (request, reply) => {
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
		energyModel.find([["startTime", ">", d]]).then((raw_data) => {
			reply.send({ data: raw_data });
		});
	});

	server.get<{
		Querystring: { n: number };
	}>("/latest", (request, reply) => {
		let n_results = 64;
		if (request.query.n) {
			if (!!Number(request.query.n)) {
				n_results = Number(request.query.n);
			} else {
				reply.code(400).type("text/plain").send("Err 400: Invalid Request");
				return;
			}
		}
		energyModel
			.find({}, { limit: n_results, order: ["startTime", "desc"] })
			.then((raw_data) => {
				function to_delta_string(dt: Date): string {
					const delta_min = Math.abs(dt.getTime() - new Date().getTime()) / 6e4;
					return delta_min < 60 ? `${delta_min.toFixed(0)}min` : `${(delta_min / 60).toPrecision(2)}hr`;
				}
				//Create array of energy readings starting with the most recent
				const readings = Object.values(raw_data).map((row: EnergyEntry) => row.energy);
				//Time of earliest read in list
				const earliest_dt: Date = Object.values(raw_data)[raw_data.length - 1].startTime;
				const earliest_delta = to_delta_string(earliest_dt);
				//Time of peak (most recent if tie)
				const peak_index = readings.indexOf(Math.max.apply(null, readings));
				const peak = Object.values(raw_data)[peak_index].energy;
				const peak_dt = Object.values(raw_data)[peak_index].startTime;
				const peak_delta = to_delta_string(peak_dt);
				//Time of latest read in list
				const latest_dt: Date = Object.values(raw_data)[0].startTime;
				const latest_delta = to_delta_string(latest_dt);
				const resp_data = { earliest_delta, latest_delta, peak, peak_delta, readings };
				reply.send(resp_data);
			})
			.catch((err: any) => {
				console.log(chalk.red("Failed to fetch latest data:", err));
				reply.code(500).send();
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
