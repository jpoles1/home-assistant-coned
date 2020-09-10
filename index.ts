// Import config from .env
require("dotenv").config();
import {Coned} from "./coned";

interface PowerEntrySchema {

}

async function main() {
    let c = new Coned();
    await c.init();
    await c.fetch_once();
}

main();
