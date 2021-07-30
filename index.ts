// Import config from .env
require("dotenv").config();  
import {ConEd} from "./coned";

import { connect } from "trilogy"; 

const db = connect('./storage.db')

const powerSchema = {
    id: 'increments',
    startTime: { type: Date, unique: true },
    endTime: { type: Date, unique: true },
    power: Number,
} 
    
async function main() {
    const powerModel = await db.model('power', powerSchema)

    async function db_store(raw_data) { 
        console.log(raw_data);
        powerModel.updateOrCreate() 
    } 

    let c = new ConEd({db_store});
    await c.init();
    await c.monitor(); 
}

main();
