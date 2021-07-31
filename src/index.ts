// Import config from .env

// eslint-disable-next-line
require("dotenv").config();

import { ConEd } from "./coned";

import { connect } from "trilogy";
import chalk from "chalk";

const powerSchema = {
	id: "increments",
	startTime: { type: Date, unique: true },
	endTime: { type: Date, unique: true },
	power: { type: Number },
};

async function main() {
	async function db_store(raw_data: any, output_dir: string) {
		const db = connect(`./${output_dir}/storage.db`);
		const powerModel = await db.model("power", powerSchema);
		const filtered_data = raw_data.reads.filter((row: any) => {
			return row.value !== null && row.value !== undefined;
		});
		for (const row of filtered_data) {
			await powerModel.updateOrCreate({ startTime: new Date(row.startTime), endTime: new Date(row.endTime) }, { power: row.value }).catch((e) => {
				console.log(chalk.red(`Err: ${e}`));
			});
		}
		console.log(chalk.green("Database Updated!"));
		await db.close();
		console.log(chalk.green("Database Closed!"));
	}

	const c = new ConEd({ db_store });
	await c.init();
	await c.monitor();
}

main();
